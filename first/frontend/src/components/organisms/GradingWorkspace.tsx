import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Calculator, Eraser } from "lucide-react";
import { HistoryDropdown } from "@/components/atoms/Navbar";
import { PrimaryButton } from "@/components/atoms/PrimaryButton";
import { Breadcrumb, type BreadcrumbItem } from "@/components/atoms/Breadcrumb";
import { FabHelp } from "@/components/atoms/FabHelp";
import { PageCampusDeco } from "@/components/atoms/PageCampusDeco";
import { useIsStudentUi } from "@/hooks/useIsStudentUi";
import { IpBrandFace } from "@/components/atoms/IpMascot";
import { HomeworkPreview, type PaperMark } from "@/components/atoms/HomeworkPreview";
import { StepIndicator, getGradingStepLabel } from "@/components/molecules/StepIndicator";
import { UploadDropzone } from "@/components/organisms/UploadDropzone";
import { ScoreResultCard } from "@/components/organisms/ScoreResultCard";
import { AiHelpModal } from "@/components/organisms/AiHelpModal";
import { BatchInsightsModal } from "@/components/organisms/BatchInsightsModal";
import {
  GradingContextModal,
  type GradingContextConfirmPayload,
} from "@/components/molecules/GradingContextModal";
import { TeacherGradingDisputeToolbarButton } from "@/components/molecules/GradingDisputePanels";
import { useAppSession } from "@/hooks/useAppSession";
import { submitGrade } from "@/lib/gradeApi";
import { mapWithConcurrency } from "@/lib/batchConcurrency";
import type { GradingFeedbackTrace } from "@/lib/gradingFeedbackApi";
import {
  buildGroupedHistoryRows,
  clearGradingHistoryForSubject,
  deleteGradingHistoryEntry,
  deleteGradingHistoryGroup,
  loadGradingHistory,
  saveGradingHistoryEntry,
  type GradingHistoryEntry,
} from "@/lib/gradingHistory";
import { clearGradingLiveDraft, loadGradingLiveDraft, saveGradingLiveDraft } from "@/lib/gradingSession";
import { deleteHistoryImageBlob, getHistoryImageBlob, putHistoryImageBlob } from "@/lib/gradingHistoryImageDb";
import { fileToJpegBlobForStorage, fileToJpegThumbDataUrl } from "@/lib/imageThumb";
import { GlassOpacityControl } from "@/components/molecules/GlassOpacityControl";
import type { BatchInsightsResponse } from "@/lib/gradingBatchInsights";
import { saveUserPreferences } from "@/lib/userPreferences";
import { checkImageQuality } from "@/lib/imageQualityCheck";
import { rememberStudentFromGrading } from "@/lib/studentRoster";
import { canManageGrading } from "@/lib/rolePermissions";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { CUTE_ICON } from "@/components/atoms/cuteIcon";
import type { DimensionScore, GradingResultDetail, UploadPanelStatus } from "@/types/grading";

export type GradingWorkspaceProps = {
  /** 面包屑中学科名称（与步骤条并列展示） */
  subjectLabel: string;
  uploadTitle: string;
  uploadHint?: string;
  subject: "math" | "english";
};

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "bmp", "gif"]);

const CONTENT_MAX = "max-w-7xl w-full min-w-0";

function deriveBatchFolderLabel(files: File[]): string | undefined {
  const paths = files
    .map((f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath)
    .filter((p): p is string => Boolean(p && /[/\\]/.test(p)));
  if (paths.length < 2) return undefined;
  const roots = paths.map((p) => p.split(/[/\\]/)[0]).filter(Boolean);
  if (!roots.length) return undefined;
  const first = roots[0];
  if (!roots.every((r) => r === first)) return undefined;
  const label = first.trim();
  return label || undefined;
}

function safeReleaseObjectUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function isAllowedImageFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_IMAGE_TYPES.has(file.type) || ALLOWED_IMAGE_EXTENSIONS.has(ext);
}

const SUBJECT_TOOLBAR_ICON = { math: Calculator, english: BookOpen } as const;

/**
 * 批改页主体：选图 →「开始批改」→ 识别与结果；面包屑随步骤更新。
 */
export function GradingWorkspace({
  subjectLabel,
  uploadTitle,
  uploadHint,
  subject,
}: GradingWorkspaceProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadPanelStatus>({ phase: "idle" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<GradingResultDetail | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchResults, setBatchResults] = useState<Array<GradingResultDetail | null>>([]);
  const [batchErrors, setBatchErrors] = useState<Array<string | null>>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [gradingProgress, setGradingProgress] = useState({ done: 0, total: 0 });
  const [isGrading, setIsGrading] = useState(false);
  const [step, setStep] = useState(1);

  const prefs = useUserPreferences();
  const session = useAppSession();
  const canManage = session ? canManageGrading(session) : false;
  const isStudentUi = useIsStudentUi();
  const [helpOpen, setHelpOpen] = useState(false);
  const [batchInsightsOpen, setBatchInsightsOpen] = useState(false);
  const [cachedBatchInsights, setCachedBatchInsights] = useState<BatchInsightsResponse | null>(null);
  /** 无本地文件列表时（历史/草稿）用于学情与导出的显示名 */
  const [insightFileName, setInsightFileName] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<GradingHistoryEntry[]>(() => loadGradingHistory());
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [contextFileCount, setContextFileCount] = useState(0);
  const [teacherGradeLevel, setTeacherGradeLevel] = useState(() =>
    prefs.rememberGradingContext ? prefs.defaultGradeLevel : "",
  );
  const [teacherNote, setTeacherNote] = useState(() => (prefs.rememberGradingContext ? prefs.defaultTeacherNote : ""));
  const [studentName, setStudentName] = useState("");
  const [essayPromptText, setEssayPromptText] = useState("");
  const essayPromptFileRef = useRef<File | null>(null);
  /** 与 serverPreviewByIndexRef 同步：服务端 `/uploads/...` 路径，按批改批次下标 */
  const [serverImageUrlByIndex, setServerImageUrlByIndex] = useState<Record<number, string>>({});
  /** 与 historyIdByIndexRef 同步：本地历史 IndexedDB id */
  const [historyEntryIdByIndex, setHistoryEntryIdByIndex] = useState<Record<number, string>>({});

  const previewUrlRef = useRef<string | null>(null);
  /** 批量批改时各张图对应的服务端预览路径（用于刷新后恢复、切换缩略图） */
  const serverPreviewByIndexRef = useRef<Record<number, string>>({});
  /** 各张图对应历史记录 id（IndexedDB 原图），用于刷新后恢复预览 */
  const historyIdByIndexRef = useRef<Record<number, string>>({});
  /** 当前待批改的本地文件，提交给 `/api/grade` */
  const pendingFileRef = useRef<File | null>(null);
  /** 选图后、老师确认弹窗前暂存的图片列表 */
  const pendingImagePickRef = useRef<File[] | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const progressTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const clearProgressTick = useCallback(() => {
    if (progressTickRef.current) {
      clearInterval(progressTickRef.current);
      progressTickRef.current = null;
    }
  }, []);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      clearTimers();
      clearProgressTick();
      /* 不在此 revoke blob：React 18 Strict Mode 会重复卸载/挂载，易误 revoke 仍用于 <img> 的 URL */
    };
  }, [clearTimers, clearProgressTick]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  /** 同一会话内刷新：恢复最近一次成功批改的结果与预览（优先 IndexedDB 原图） */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const d = loadGradingLiveDraft(subject);
      if (!d?.detail) return;
      setResult(d.detail);
      setInsightFileName(d.fileName?.trim() ?? "");
      setCachedBatchInsights(null);
      const s = d.step;
      setStep(s >= 1 && s <= 3 ? s : 3);

      let nextPreview: string | null = null;
      if (d.historyEntryId) {
        for (let attempt = 0; attempt < 6 && !nextPreview; attempt += 1) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 150));
          try {
            const blob = await getHistoryImageBlob(d.historyEntryId);
            if (blob) {
              const u = URL.createObjectURL(blob);
              if (cancelled) {
                URL.revokeObjectURL(u);
              } else {
                nextPreview = u;
              }
            }
          } catch {
            /* ignore */
          }
          if (cancelled) break;
        }
      }
      if (!nextPreview && d.imageUrl) {
        nextPreview = d.imageUrl;
      }
      if (!cancelled && nextPreview) {
        setPreviewUrl(nextPreview);
        previewUrlRef.current = nextPreview;
      }

      if (!cancelled) {
        if (d.imageUrl && String(d.imageUrl).includes("/uploads/")) {
          setServerImageUrlByIndex({ 0: d.imageUrl });
        } else {
          setServerImageUrlByIndex({});
        }
        if (d.historyEntryId) {
          setHistoryEntryIdByIndex({ 0: d.historyEntryId });
        } else {
          setHistoryEntryIdByIndex({});
        }
      }

      setUploadStatus({ phase: "info", message: "已恢复离开前的批改页面（刷新后仍保留）。" });
      schedule(() => setUploadStatus({ phase: "idle" }), 4200);
    })();
    return () => {
      cancelled = true;
    };
  }, [subject, schedule]);

  const clearCurrentWorkspace = useCallback(() => {
    if (isGrading) return;
    const hasContent =
      Boolean(previewUrl) ||
      Boolean(result) ||
      selectedFiles.length > 0 ||
      Object.keys(serverPreviewByIndexRef.current).length > 0 ||
      contextModalOpen;
    if (!hasContent) {
      setUploadStatus({ phase: "info", message: "当前没有可清空的内容。" });
      schedule(() => setUploadStatus({ phase: "idle" }), 2200);
      return;
    }
    if (!window.confirm("确定清空当前页的选题、预览与批改结果？（不会删除「批改历史」中的已存记录）")) return;
    clearTimers();
    clearProgressTick();
    clearGradingLiveDraft(subject);
    serverPreviewByIndexRef.current = {};
    historyIdByIndexRef.current = {};
    setServerImageUrlByIndex({});
    setHistoryEntryIdByIndex({});
    pendingFileRef.current = null;
    pendingImagePickRef.current = null;
    setContextModalOpen(false);
    setTeacherGradeLevel("");
    setTeacherNote("");
    setEssayPromptText("");
    essayPromptFileRef.current = null;
    if (previewUrlRef.current?.startsWith("blob:")) safeReleaseObjectUrl(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setSelectedFiles([]);
    setBatchResults([]);
    setBatchErrors([]);
    setCurrentFileIndex(0);
    setGradingProgress({ done: 0, total: 0 });
    setResult(null);
    setInsightFileName("");
    setCachedBatchInsights(null);
    setStep(1);
    setIsGrading(false);
    setUploadStatus({ phase: "info", message: "已清空当前页内容，可重新上传作业。" });
    schedule(() => setUploadStatus({ phase: "idle" }), 3200);
  }, [clearProgressTick, clearTimers, contextModalOpen, isGrading, previewUrl, result, schedule, selectedFiles.length, subject]);

  const location = useLocation();
  const navigate = useNavigate();

  const refreshHistory = useCallback(() => {
    setHistoryItems(loadGradingHistory());
  }, []);

  const cancelImagePick = useCallback(() => {
    pendingImagePickRef.current = null;
    setContextModalOpen(false);
    setUploadStatus({ phase: "info", message: "已取消本次选图。" });
    schedule(() => setUploadStatus({ phase: "idle" }), 2400);
  }, [schedule]);

  const applyConfirmedImagePick = useCallback(
    (payload: GradingContextConfirmPayload) => {
      const imageFiles = pendingImagePickRef.current;
      if (!imageFiles?.length) {
        setContextModalOpen(false);
        return;
      }
      pendingImagePickRef.current = null;
      setContextModalOpen(false);
      setTeacherGradeLevel(payload.gradeLevel);
      setTeacherNote(payload.teacherNote);
      if (canManage) {
        const name = payload.studentName?.trim() ?? "";
        setStudentName(name);
        if (name) rememberStudentFromGrading(name);
      }
      setEssayPromptText(payload.essayPromptText ?? "");
      essayPromptFileRef.current = payload.essayPromptFile ?? null;

      clearTimers();
      clearGradingLiveDraft(subject);
      serverPreviewByIndexRef.current = {};
      historyIdByIndexRef.current = {};
      setServerImageUrlByIndex({});
      setHistoryEntryIdByIndex({});
      if (previewUrlRef.current) {
        safeReleaseObjectUrl(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      const file = imageFiles[0];
      pendingFileRef.current = file;
      setSelectedFiles(imageFiles);
      setBatchResults(Array.from({ length: imageFiles.length }, () => null));
      setBatchErrors(Array.from({ length: imageFiles.length }, () => null));
      setGradingProgress({ done: 0, total: imageFiles.length });
      setCurrentFileIndex(0);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setResult(null);
      setInsightFileName(imageFiles.length === 1 ? imageFiles[0]!.name : "");
      setCachedBatchInsights(null);
      setStep(1);
      setIsGrading(false);
      setUploadStatus(
        imageFiles.length > 1 ? { phase: "info", message: `已从文件夹中识别 ${imageFiles.length} 张图片` } : { phase: "idle" },
      );
      if (imageFiles.length > 1) schedule(() => setUploadStatus({ phase: "idle" }), 3200);
      void checkImageQuality(file).then((q) => {
        if (!q.ok && q.message) {
          setUploadStatus({ phase: "info", message: q.message });
          schedule(() => setUploadStatus({ phase: "idle" }), 6500);
        }
      });
      if (prefs.rememberGradingContext) {
        saveUserPreferences({
          defaultGradeLevel: payload.gradeLevel,
          defaultTeacherNote: payload.teacherNote,
        });
      }
    },
    [clearTimers, canManage, prefs.rememberGradingContext, schedule, subject]
  );

  useEffect(() => {
    if (!prefs.rememberGradingContext) return;
    setTeacherGradeLevel(prefs.defaultGradeLevel);
    setTeacherNote(prefs.defaultTeacherNote);
  }, [prefs.defaultGradeLevel, prefs.defaultTeacherNote, prefs.rememberGradingContext]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;

      window.setTimeout(() => {
        const imageFiles = Array.from(files).filter(isAllowedImageFile).sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
        if (!imageFiles.length) {
          setUploadStatus({
            phase: "error",
            message: "未识别到可批改图片，请上传 JPG、PNG、WebP、BMP 或 GIF。",
          });
          schedule(() => setUploadStatus({ phase: "idle" }), 4500);
          return;
        }

        pendingImagePickRef.current = imageFiles;
        setContextFileCount(imageFiles.length);
        setContextModalOpen(true);
      }, 0);
    },
    [schedule]
  );

  const handleStartGrading = useCallback(async () => {
    const files = selectedFiles.length ? selectedFiles : pendingFileRef.current ? [pendingFileRef.current] : [];
    if (!files.length || !previewUrl) return;

    const batchFolderLabel = files.length > 1 ? deriveBatchFolderLabel(files) : undefined;

    clearGradingLiveDraft(subject);
    historyIdByIndexRef.current = {};

    setUploadStatus({
      phase: "uploading",
      progress: 0,
      message: files.length > 1 ? `正在批改整个文件夹（0/${files.length}）` : "正在批改当前图片",
    });
    setResult(null);
    setBatchResults(Array.from({ length: files.length }, () => null));
    setBatchErrors(Array.from({ length: files.length }, () => null));
    setCachedBatchInsights(null);
    setGradingProgress({ done: 0, total: files.length });
    setStep(2);
    setIsGrading(true);

    const nextResults: Array<GradingResultDetail | null> = Array.from({ length: files.length }, () => null);
    const nextErrors: Array<string | null> = Array.from({ length: files.length }, () => null);

    const folderGroupKey =
      files.length > 1 ? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `folder-${Date.now()}`) : undefined;

    let completed = 0;
    await mapWithConcurrency(
      files,
      2,
      async (file, index) => {
        const base = (index / files.length) * 100;
        const span = (1 / files.length) * 100;
        let visual = base;
        clearProgressTick();
        progressTickRef.current = setInterval(() => {
          visual = Math.min(visual + span / 12, base + span * 0.9);
          setUploadStatus({
            phase: "uploading",
            progress: Math.round(visual),
            message: files.length > 1 ? `正在批改整个文件夹（${completed + 1}/${files.length}）` : "正在批改当前图片",
          });
        }, 240);

        try {
          const { detail, imageUrl } = await submitGrade(file, subject, {
            gradeLevel: teacherGradeLevel.trim() || undefined,
            teacherNote: teacherNote.trim() || undefined,
            essayPromptText: subject === "english" ? essayPromptText.trim() || undefined : undefined,
            essayPromptFile: subject === "english" ? essayPromptFileRef.current ?? undefined : undefined,
          });
          nextResults[index] = detail;
          setBatchResults([...nextResults]);
          setResult(detail);
          if (imageUrl) {
            serverPreviewByIndexRef.current[index] = imageUrl;
            setServerImageUrlByIndex((prev) => ({ ...prev, [index]: imageUrl }));
          }
          try {
            const thumb = await fileToJpegThumbDataUrl(file);
            const rec = saveGradingHistoryEntry({
              subject,
              fileName: file.name,
              detail,
              ...(canManage || session?.role === "parent"
                ? studentName.trim()
                  ? { studentName: studentName.trim() }
                  : {}
                : {}),
              ...(teacherGradeLevel.trim() ? { gradeLevel: teacherGradeLevel.trim() } : {}),
              ...(thumb ? { thumbDataUrl: thumb } : {}),
              ...(folderGroupKey
                ? {
                    groupKey: folderGroupKey,
                    groupIndex: index + 1,
                    groupSize: files.length,
                    ...(batchFolderLabel ? { groupName: batchFolderLabel } : {}),
                  }
                : {}),
            });
            historyIdByIndexRef.current[index] = rec.id;
            setHistoryEntryIdByIndex((prev) => ({ ...prev, [index]: rec.id }));
            refreshHistory();
            try {
              const blob = await fileToJpegBlobForStorage(file);
              await putHistoryImageBlob(rec.id, blob);
            } catch {
              /* ignore */
            }
          } catch {
            /* ignore */
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "批改失败，请稍后重试。";
          nextErrors[index] = msg;
          setBatchErrors([...nextErrors]);
        } finally {
          clearProgressTick();
          completed += 1;
          const pct = Math.round((completed / files.length) * 100);
          setGradingProgress({ done: completed, total: files.length });
          setUploadStatus({
            phase: "uploading",
            progress: pct,
            message: files.length > 1 ? `正在批改整个文件夹（${completed}/${files.length}）` : "正在批改当前图片",
          });
        }
      },
    );

    const firstResultIndex = nextResults.findIndex(Boolean);
    if (firstResultIndex >= 0) {
      setResult(nextResults[firstResultIndex]!);
      if (firstResultIndex !== 0) {
        const file = files[firstResultIndex];
        if (previewUrlRef.current?.startsWith("blob:")) {
          safeReleaseObjectUrl(previewUrlRef.current);
        }
        pendingFileRef.current = file;
        setCurrentFileIndex(firstResultIndex);
        const url = URL.createObjectURL(file);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } else {
        setCurrentFileIndex(0);
        /* 首张仍用本地上传 blob，不把预览换成 /uploads（避免批改完成后图片裂图） */
      }
      setStep(3);
      const idx = firstResultIndex;
      saveGradingLiveDraft(subject, {
        imageUrl: serverPreviewByIndexRef.current[idx] ?? "",
        historyEntryId: historyIdByIndexRef.current[idx],
        detail: nextResults[idx]!,
        step: 3,
        fileName: files[idx]?.name ?? "",
        savedAt: Date.now(),
      });
      setUploadStatus({
        phase: "success",
        message:
          files.length > 1
            ? `文件夹批改完成：成功 ${nextResults.filter(Boolean).length} 张，失败 ${nextErrors.filter(Boolean).length} 张`
            : "批改完成",
      });
      schedule(() => setUploadStatus({ phase: "idle" }), 3000);
    } else {
      clearGradingLiveDraft(subject);
      setUploadStatus({ phase: "error", message: nextErrors.find(Boolean) || "文件夹内图片均批改失败，请稍后重试。" });
      setStep(1);
    }

    setIsGrading(false);
  }, [
    clearProgressTick,
    essayPromptText,
    canManage,
    previewUrl,
    refreshHistory,
    schedule,
    selectedFiles,
    studentName,
    subject,
    teacherGradeLevel,
    teacherNote,
  ]);

  const selectPreviewFile = useCallback(
    (index: number) => {
      const file = selectedFiles[index];
      if (!file || isGrading) return;
      if (previewUrlRef.current?.startsWith("blob:")) safeReleaseObjectUrl(previewUrlRef.current);
      pendingFileRef.current = file;
      setCurrentFileIndex(index);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setResult(batchResults[index] ?? null);
      setStep(batchResults[index] ? 3 : 1);
      setUploadStatus(batchErrors[index] ? { phase: "error", message: batchErrors[index]! } : { phase: "idle" });
    },
    [batchErrors, batchResults, isGrading, selectedFiles]
  );

  const applyHistoryEntry = useCallback(
    (entry: GradingHistoryEntry) => {
      if (isGrading) return;
      if (entry.subject !== subject) {
        setUploadStatus({
          phase: "error",
          message: `该记录属于「${entry.subject === "math" ? "数学" : "英语"}」批改，请在对应学科页面打开历史。`,
        });
        schedule(() => setUploadStatus({ phase: "idle" }), 5000);
        return;
      }
      setTeacherGradeLevel("");
      setTeacherNote("");
      if (previewUrlRef.current?.startsWith("blob:")) safeReleaseObjectUrl(previewUrlRef.current);
      previewUrlRef.current = null;
      pendingFileRef.current = null;
      serverPreviewByIndexRef.current = {};
      historyIdByIndexRef.current = {};
      setServerImageUrlByIndex({});
      setHistoryEntryIdByIndex({ 0: entry.id });
      setSelectedFiles([]);
      setBatchResults([]);
      setBatchErrors([]);
      setCurrentFileIndex(0);
      setGradingProgress({ done: 0, total: 0 });
      setResult(entry.detail);
      setInsightFileName(entry.fileName);
      setCachedBatchInsights(null);
      setStep(3);
      setPreviewUrl(null);
      void (async () => {
        try {
          const blob = await getHistoryImageBlob(entry.id);
          if (blob) {
            const u = URL.createObjectURL(blob);
            if (previewUrlRef.current?.startsWith("blob:")) safeReleaseObjectUrl(previewUrlRef.current);
            previewUrlRef.current = u;
            setPreviewUrl(u);
          }
        } catch {
          /* ignore */
        }
      })();
      setUploadStatus({
        phase: "info",
        message: `已载入历史：${entry.fileName}（左侧为存于本机的原图预览，若无图请重新上传对照）`,
      });
      schedule(() => setUploadStatus({ phase: "idle" }), 4000);
      setHistoryOpen(false);
      saveGradingLiveDraft(subject, {
        imageUrl: "",
        historyEntryId: entry.id,
        detail: entry.detail,
        step: 3,
        fileName: entry.fileName,
        savedAt: Date.now(),
      });
    },
    [isGrading, schedule, subject],
  );

  useEffect(() => {
    const st = location.state as { openGradingHistory?: boolean; historyEntryId?: string } | null;
    if (!st || isGrading) return;
    if (st.historyEntryId) {
      const entry = loadGradingHistory().find((e) => e.id === st.historyEntryId);
      if (entry && entry.subject === subject) {
        applyHistoryEntry(entry);
      }
      navigate(
        { pathname: location.pathname, search: location.search, hash: location.hash },
        { replace: true, state: {} }
      );
      return;
    }
    if (st.openGradingHistory) {
      refreshHistory();
      setHistoryOpen(true);
      navigate(
        { pathname: location.pathname, search: location.search, hash: location.hash },
        { replace: true, state: {} }
      );
    }
  }, [
    location.pathname,
    location.search,
    location.hash,
    location.state,
    subject,
    isGrading,
    applyHistoryEntry,
    refreshHistory,
    navigate,
  ]);

  const uploadLocked =
    isGrading || uploadStatus.phase === "uploading" || (step < 3 && uploadStatus.phase === "success");

  const errorRegions = result?.errorRegions ?? [];

  const startDisabled = !previewUrl || uploadLocked;
  const startButtonText = selectedFiles.length > 1 ? `开始批改整个文件夹（${selectedFiles.length} 张）` : "开始批改";
  const batchSuccessCount = batchResults.filter(Boolean).length;
  const batchFailCount = batchErrors.filter(Boolean).length;

  const historyForSubject = useMemo(() => historyItems.filter((h) => h.subject === subject), [historyItems, subject]);
  const historyRows = useMemo(() => buildGroupedHistoryRows(historyForSubject), [historyForSubject]);

  const exportBaseName = useMemo(() => {
    const name = selectedFiles[currentFileIndex]?.name ?? "";
    const stem = name.replace(/\.[^/.]+$/, "").trim();
    return stem || "作业批改";
  }, [selectedFiles, currentFileIndex]);

  const batchInsightEntries = useMemo(() => {
    const out: Array<{ fileName: string; detail: GradingResultDetail }> = [];
    if (result && selectedFiles.length === 1) {
      return [{ fileName: selectedFiles[0]!.name, detail: result }];
    }
    if (selectedFiles.length > 1 && batchResults.length > 0) {
      selectedFiles.forEach((file, index) => {
        const detail = batchResults[index];
        if (detail) out.push({ fileName: file.name, detail });
      });
      return out;
    }
    if (result && selectedFiles.length === 0) {
      out.push({ fileName: insightFileName.trim() || exportBaseName, detail: result });
    }
    return out;
  }, [selectedFiles, batchResults, result, exportBaseName, insightFileName]);

  const batchInsightGroupName = useMemo(() => {
    if (selectedFiles.length > 1) {
      return deriveBatchFolderLabel(selectedFiles) ?? `本批 ${selectedFiles.length} 张`;
    }
    if (selectedFiles.length === 1) {
      return selectedFiles[0]!.name.replace(/\.[^/.]+$/, "") || "本份作业";
    }
    if (insightFileName.trim()) return insightFileName.trim().replace(/\.[^/.]+$/, "");
    return undefined;
  }, [selectedFiles, insightFileName]);

  /** 写入反馈 JSONL：当前卷服务端路径、本地历史 id、批次与文件名 */
  const gradingFeedbackTrace = useMemo((): GradingFeedbackTrace => {
    if (selectedFiles.length > 0) {
      const batchTotal = selectedFiles.length;
      const batchIndex = Math.min(Math.max(0, currentFileIndex), batchTotal - 1);
      const file = selectedFiles[batchIndex];
      return {
        serverImageUrl: serverImageUrlByIndex[batchIndex] ?? null,
        historyEntryId: historyEntryIdByIndex[batchIndex] ?? null,
        localFileName: file?.name ?? null,
        batchIndex,
        batchTotal,
      };
    }
    return {
      serverImageUrl: serverImageUrlByIndex[0] ?? null,
      historyEntryId: historyEntryIdByIndex[0] ?? null,
      localFileName: null,
      batchIndex: 0,
      batchTotal: 1,
    };
  }, [currentFileIndex, selectedFiles, serverImageUrlByIndex, historyEntryIdByIndex]);

  const applyDimensionUpdate = useCallback(
    (dimensionKey: string, patch: Partial<DimensionScore>) => {
      const updater = (prev: GradingResultDetail | null): GradingResultDetail | null => {
        if (!prev) return prev;
        const dimensions = prev.dimensions.map((d) => (d.key === dimensionKey ? { ...d, ...patch } : d));
        const total = dimensions.reduce((s, d) => s + d.value, 0);
        const max = dimensions.reduce((s, d) => s + d.max, 0);
        const scorePercent = max > 0 ? Math.round((total / max) * 100) : prev.scorePercent;
        return { ...prev, dimensions, scorePercent };
      };
      setResult(updater);
      if (selectedFiles.length > 0) {
        setBatchResults((prev) => {
          const next = [...prev];
          const idx = currentFileIndex;
          if (next[idx]) next[idx] = updater(next[idx]);
          return next;
        });
      }
    },
    [currentFileIndex, selectedFiles.length],
  );

  /** 数学：在试卷预览右侧按题序叠对/错/半对（与分项列表顺序一致，非像素级坐标） */
  const paperMarks = useMemo<PaperMark[] | undefined>(() => {
    if (!prefs.showMathPaperMarks || subject !== "math" || !previewUrl || !result?.dimensions?.length) return undefined;
    const dims = result.dimensions;
    return dims.map((d, i) => {
      const st = (d.status ?? "").trim();
      let kind: PaperMark["kind"] = "neutral";
      if (st === "正确") kind = "ok";
      else if (st === "错误" || st === "未作答") kind = "bad";
      else if (st === "过程不规范") kind = "half";
      const idMatch = d.label.match(/^第\s*(\d+)/);
      const label = idMatch?.[1] ?? String(i + 1);
      return { label, kind };
    });
  }, [prefs.showMathPaperMarks, subject, previewUrl, result]);

  const breadcrumbItems: BreadcrumbItem[] = useMemo(
    () => [
      { label: "首页", to: "/" },
      { label: subjectLabel },
      { label: getGradingStepLabel(step) },
    ],
    [subjectLabel, step]
  );

  const combinedHint = [uploadHint, "可用「选择文件夹」或拖入整个文件夹，批量识别图片。"].filter(Boolean).join(" ");

  const progressPercent = uploadStatus.phase === "uploading" ? uploadStatus.progress : 0;
  const showWorkspaceProgress = uploadStatus.phase === "uploading" && progressPercent >= 0;

  const SubjectToolbarIcon = SUBJECT_TOOLBAR_ICON[subject];

  return (
    <div className="page-bg-hero-stunning relative flex min-h-dvh min-h-screen flex-1 flex-col">
      {isStudentUi ? <PageCampusDeco /> : null}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col">
        <main className={`mx-auto w-full min-w-0 max-w-full flex-1 px-4 pt-6 pb-3 md:px-6 md:pt-8 md:pb-4 ${CONTENT_MAX}`}>
          <div
            className={`glass-panel mb-6 min-w-0 max-w-full rounded-2xl bg-gradient-to-r from-white/55 via-primary-tint/25 to-white/50 px-3 py-3 md:flex md:items-center md:justify-between md:gap-4 md:px-4 md:py-2.5 ${isStudentUi ? "animate-bounce-in" : ""}`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3 md:gap-4">
              <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
                <div className="flex shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-white/90 p-0.5 shadow-sm ring-1 ring-primary/10 sm:rounded-2xl sm:p-1">
                <Link
                  to="/"
                  title="返回应用首页"
                  aria-label="返回应用首页"
                  className="group flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-[0.98] sm:h-12 sm:w-12 md:h-[3.35rem] md:w-[3.35rem]"
                >
                  <IpBrandFace
                    size="md"
                    decorative
                    className="!h-10 !w-10 transition group-hover:drop-shadow-lg sm:!h-12 sm:!w-12 md:!h-[3.35rem] md:!w-[3.35rem]"
                  />
                </Link>
              </div>
                <div
                  className="inline-flex w-fit max-w-full shrink-0 cursor-default select-none items-center gap-2 rounded-xl border border-primary/22 bg-primary-tint/70 px-2.5 py-1.5 shadow-sm md:gap-2.5 md:px-3 md:py-2"
                  role="status"
                  aria-live="polite"
                  aria-label={`${subjectLabel} · 智能批改`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/90 text-primary shadow-sm ring-1 ring-primary/15 md:h-10 md:w-10 md:rounded-xl">
                    <SubjectToolbarIcon className="h-4 w-4 md:h-5 md:w-5" {...CUTE_ICON} aria-hidden />
                  </span>
                  <span className="text-small font-bold leading-snug text-ink md:text-body">
                    {subjectLabel}
                    <span className="font-semibold text-ink-muted"> · 智能批改</span>
                  </span>
                </div>
              </div>
              <div className="hidden h-8 w-px shrink-0 bg-primary/15 sm:block" aria-hidden />
              <div className="min-w-0 flex-1">
                <Breadcrumb items={breadcrumbItems} variant="embedded" contentMaxClassName="max-w-none" />
              </div>
            </div>
            <div className="relative z-[80] mt-3 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-black/[0.06] pt-3 md:mt-0 md:border-t-0 md:pt-0">
              <GlassOpacityControl
                compact
                value={prefs.glassOpacity}
                onChange={(v) => saveUserPreferences({ glassOpacity: v })}
              />
              {canManage ? <TeacherGradingDisputeToolbarButton /> : null}
              <HistoryDropdown variant="toolbar" subjectScope={subject} />
            </div>
          </div>

          {isStudentUi ? (
            <p className="campus-banner-strip animate-fade-up-in mb-4">
              <span>📚 校园智能批改</span>
              <span className="text-ink-subtle" aria-hidden>
                ·
              </span>
              <span>过程分看得见，错题自动进错题本</span>
            </p>
          ) : null}
          {session?.role === "parent" ? (
            <p className="mb-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-rose-200/80 bg-gradient-to-r from-rose-50/95 via-white to-amber-50/80 px-4 py-2.5 text-center text-caption font-semibold text-rose-950">
              <span>家长代拍模式</span>
              <span className="text-ink-subtle" aria-hidden>
                ·
              </span>
              <span className="font-normal text-ink-muted">上传前请填写孩子姓名；结果保存在本机，不可改分或申诉审核</span>
            </p>
          ) : null}

          <div key={step} className={isStudentUi ? "animate-step-flow min-w-0 max-w-full" : "min-w-0 max-w-full"}>
            <StepIndicator
              current={step}
              trailingSlot={
                <button
                  type="button"
                  disabled={isGrading}
                  onClick={clearCurrentWorkspace}
                  className="inline-flex min-h-10 w-full flex-col items-center justify-center gap-1 rounded-xl border border-white/50 bg-white/55 px-2.5 py-2 text-center text-caption font-extrabold leading-tight text-ink-muted shadow-sm backdrop-blur-sm transition hover:border-amber-300 hover:bg-amber-50/75 hover:text-amber-950 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-0 sm:max-w-[5.25rem] sm:px-2"
                >
                  <Eraser className="h-4 w-4 shrink-0" {...CUTE_ICON} aria-hidden />
                  <span>清空当前页</span>
                </button>
              }
            />
            <div className="mt-6 grid w-full min-w-0 max-w-full grid-cols-1 gap-6 md:mt-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-stretch md:gap-6 lg:gap-8">
              <div
                className={`glass-panel flex h-full min-h-0 min-w-0 max-w-full flex-col gap-3 overflow-hidden rounded-[1.35rem] p-4 md:gap-4 md:p-5 ${isStudentUi ? "animate-bounce-in stagger-1" : ""}`}
              >
                <UploadDropzone
                  title={uploadTitle}
                  hint={combinedHint}
                  onFiles={handleFiles}
                  status={step >= 3 && !isGrading ? { phase: "idle" } : uploadStatus}
                  locked={uploadLocked}
                  compact={step >= 3 && !isGrading}
                />
                {step < 3 || isGrading ? (
                  <>
                    <div className="mx-auto w-full max-w-xl pt-1">
                      <PrimaryButton
                        className="w-full min-h-[3.25rem] rounded-2xl px-8 py-3.5 text-[0.95rem] font-extrabold shadow-[0_10px_28px_rgba(82,196,26,0.22)] ring-1 ring-white/70 md:min-h-14"
                        disabled={startDisabled}
                        onClick={handleStartGrading}
                      >
                        {isGrading && gradingProgress.total > 1
                          ? `正在批改 ${gradingProgress.done}/${gradingProgress.total}`
                          : startButtonText}
                      </PrimaryButton>
                    </div>
                    {showWorkspaceProgress ? (
                      <div className="mx-auto w-full max-w-xl rounded-full bg-white/80 p-1 shadow-inner">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-brand via-primary to-accent-mint transition-[width] duration-300 ease-out"
                          style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
                <div
                  className={
                    step >= 3 && previewUrl
                      ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
                      : "flex min-h-0 flex-col"
                  }
                >
                  {step >= 3 && previewUrl ? (
                    <p className="shrink-0 text-caption font-bold text-ink-muted">批改作业原图</p>
                  ) : null}
                  <div
                    className={
                      step >= 3 && previewUrl ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex min-h-0 flex-col"
                    }
                  >
                    <HomeworkPreview
                      fillColumn={step >= 3 && Boolean(previewUrl)}
                      imageUrl={previewUrl}
                      errorRegions={errorRegions}
                      idleHint={result && !previewUrl ? "当前为历史回顾：可重新上传原卷对照。" : undefined}
                      paperMarks={paperMarks}
                      paperMarkGrid={null}
                      showPaperMarksOnMain={false}
                    />
                  </div>
                </div>
                {selectedFiles.length > 1 ? (
                  !isGrading && (batchSuccessCount > 0 || batchFailCount > 0) ? (
                    <div className="glass-tint rounded-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-small font-extrabold text-ink">文件夹批改一览</p>
                          <p className="mt-1 text-caption text-ink-muted">
                            共 {selectedFiles.length} 张 · 成功 {batchSuccessCount} · 失败 {batchFailCount}。点击下方行切换左侧原图与右侧得分。
                          </p>
                        </div>
                      </div>
                      <ul className="mt-3 max-h-[min(40vh,16rem)] space-y-1.5 overflow-y-auto overscroll-contain">
                        {selectedFiles.map((file, index) => {
                          const r = batchResults[index];
                          const err = batchErrors[index];
                          return (
                            <li key={`${file.name}-${file.size}-${index}`}>
                              <button
                                type="button"
                                onClick={() => selectPreviewFile(index)}
                                className={[
                                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-caption transition",
                                  index === currentFileIndex
                                    ? "border-brand bg-white shadow-sm ring-1 ring-brand/25"
                                    : "border-black/[0.06] bg-white/70 hover:border-brand/35 hover:bg-white",
                                ].join(" ")}
                              >
                                <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                                  {index + 1}. {file.name}
                                </span>
                                {r ? (
                                  <span className="shrink-0 tabular-nums font-black text-[#006D41]">{r.scorePercent}%</span>
                                ) : err ? (
                                  <span className="shrink-0 font-semibold text-red-600">失败</span>
                                ) : (
                                  <span className="shrink-0 text-ink-muted">未批改</span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-card border border-black/[0.06] bg-white/85 p-3 shadow-sm">
                      <p className="mb-2 text-caption font-bold text-ink-muted">
                        文件夹图片 · 已识别 {selectedFiles.length} 张
                        {batchSuccessCount || batchFailCount ? ` · 成功 ${batchSuccessCount} 张，失败 ${batchFailCount} 张` : ""}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedFiles.map((file, index) => (
                          <button
                            key={`${file.name}-${file.size}-${index}`}
                            type="button"
                            onClick={() => selectPreviewFile(index)}
                            className={[
                              "shrink-0 rounded-full border px-3 py-1.5 text-caption font-semibold transition",
                              index === currentFileIndex
                                ? "border-brand bg-brand text-white shadow-sm"
                                : batchErrors[index]
                                  ? "border-red-200 bg-red-50 text-red-600 hover:border-red-300"
                                  : batchResults[index]
                                    ? "border-emerald-200 bg-emerald-50 text-[#006D41] hover:border-brand/40"
                                    : "border-black/[0.08] bg-surface-page text-ink-muted hover:border-brand/40 hover:text-brand",
                            ].join(" ")}
                          >
                            {batchResults[index] ? "已批改 · " : batchErrors[index] ? "失败 · " : ""}
                            {index + 1}. {file.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                ) : null}
              </div>
              <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col">
                <ScoreResultCard
                  subject={subject}
                  result={result}
                  isGrading={isGrading}
                  subjectTitle={subjectLabel}
                  exportBaseName={exportBaseName}
                  gradingFeedbackTrace={gradingFeedbackTrace}
                  onDimensionUpdate={applyDimensionUpdate}
                  batchInsightEntries={batchInsightEntries}
                  cachedBatchInsights={cachedBatchInsights}
                  onOpenBatchInsights={() => setBatchInsightsOpen(true)}
                />
              </div>
            </div>
          </div>
        </main>
        {prefs.showGradingFabHelp ? <FabHelp onClick={() => setHelpOpen(true)} /> : null}
      </div>

      <BatchInsightsModal
        open={batchInsightsOpen}
        onClose={() => setBatchInsightsOpen(false)}
        subject={subject}
        subjectLabel={subjectLabel}
        entries={batchInsightEntries}
        gradeLevel={teacherGradeLevel}
        teacherNote={teacherNote}
        groupName={batchInsightGroupName}
        onInsightsData={setCachedBatchInsights}
      />
      <AiHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <GradingContextModal
        open={contextModalOpen}
        fileCount={contextFileCount}
        subject={subject}
        initialGradeLevel={prefs.defaultGradeLevel}
        initialTeacherNote={prefs.defaultTeacherNote}
        rememberContext={prefs.rememberGradingContext}
        collectStudentName={canManage || session?.role === "parent"}
        initialStudentName={studentName}
        onConfirm={applyConfirmedImagePick}
        onCancel={cancelImagePick}
      />

      {historyOpen ? (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/35 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-label="批改历史">
          <button type="button" className="absolute inset-0" aria-label="关闭历史" onClick={() => setHistoryOpen(false)} />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-black/[0.08] bg-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] px-4 py-4">
              <div className="min-w-0">
                <p className="text-body font-extrabold text-ink">批改历史 · {subjectLabel}</p>
                <p className="mt-1 text-caption text-ink-muted">
                  约 1 年内本地记录 · 共 {historyForSubject.length} 条
                  {historyRows.length !== historyForSubject.length ? `（${historyRows.length} 组展示）` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-red-200/90 bg-red-50/90 px-3 py-1.5 text-caption font-semibold text-red-700 shadow-sm transition hover:bg-red-100"
                  onClick={() => {
                    if (!window.confirm(`确定清空「${subjectLabel}」的全部本地历史？其它学科记录将保留。`)) return;
                    const removed = clearGradingHistoryForSubject(subject);
                    removed.forEach((id) => void deleteHistoryImageBlob(id));
                    refreshHistory();
                  }}
                >
                  清空本学科
                </button>
                <button
                  type="button"
                  className="rounded-full border border-black/[0.08] px-3 py-1.5 text-caption font-semibold text-ink-muted hover:bg-black/[0.03]"
                  onClick={() => setHistoryOpen(false)}
                >
                  关闭
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {historyRows.length === 0 ? (
                <p className="px-2 py-8 text-center text-caption text-ink-muted">暂无历史，批改成功后会自动记录结果。</p>
              ) : (
                <ul className="space-y-3">
                  {historyRows.map((row) =>
                    row.type === "single" ? (
                      <li key={row.entry.id} className="rounded-2xl border border-black/[0.06] bg-primary-tint/30 p-3 shadow-sm">
                        <button
                          type="button"
                          onClick={() => applyHistoryEntry(row.entry)}
                          className="flex w-full gap-3 rounded-xl text-left transition hover:bg-white/75"
                        >
                          {row.entry.thumbDataUrl ? (
                            <img
                              src={row.entry.thumbDataUrl}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-lg border border-black/[0.06] object-cover shadow-sm"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-black/[0.1] bg-white/80 text-[0.65rem] font-semibold text-ink-muted">
                              无缩略
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="min-w-0 flex-1 truncate text-small font-bold text-ink">{row.entry.fileName}</p>
                              <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[0.65rem] font-black text-[#006D41] ring-1 ring-primary/20">
                                {row.entry.detail.scorePercent}%
                              </span>
                            </div>
                            <p className="mt-2 line-clamp-3 text-caption leading-relaxed text-ink-muted">
                              {row.entry.detail.summaryText || row.entry.detail.overallLabel}
                            </p>
                            <p className="mt-2 text-[0.65rem] text-ink-subtle">{new Date(row.entry.createdAt).toLocaleString("zh-CN")}</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          className="mt-2 w-full rounded-lg py-1.5 text-center text-[0.65rem] font-semibold text-red-600 hover:bg-red-50/80 hover:underline"
                          onClick={() => {
                            deleteGradingHistoryEntry(row.entry.id);
                            void deleteHistoryImageBlob(row.entry.id);
                            refreshHistory();
                          }}
                        >
                          删除此条
                        </button>
                      </li>
                    ) : (
                      <li key={row.groupKey} className="rounded-2xl border border-brand/25 bg-primary-tint/40 p-3 shadow-sm ring-1 ring-primary/12">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-2">
                          <p className="text-small font-extrabold text-[#006D41]">
                            {row.groupName ? `${row.groupName} · ${row.items.length} 张` : `文件夹批改 · ${row.items.length} 张`}
                          </p>
                          <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[0.65rem] font-black text-[#006D41] ring-1 ring-primary/20">
                            均分{" "}
                            {Math.round(row.items.reduce((s, i) => s + i.detail.scorePercent, 0) / row.items.length)}%
                          </span>
                        </div>
                        <p className="mt-1 text-[0.65rem] text-ink-subtle">{new Date(row.createdAt).toLocaleString("zh-CN")}</p>
                        <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto overscroll-contain">
                          {row.items.map((h) => (
                            <li key={h.id} className="rounded-xl bg-white/80 ring-1 ring-black/[0.05]">
                              <button
                                type="button"
                                onClick={() => applyHistoryEntry(h)}
                                className="flex w-full items-center gap-2 px-2 py-2 text-left transition hover:bg-white"
                              >
                                {h.thumbDataUrl ? (
                                  <img src={h.thumbDataUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                                ) : (
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-page text-[0.55rem] text-ink-muted">无图</div>
                                )}
                                <span className="min-w-0 flex-1 truncate text-caption font-semibold text-ink">{h.fileName}</span>
                                <span className="shrink-0 text-[0.65rem] font-bold text-[#006D41]">{h.detail.scorePercent}%</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="mt-2 w-full rounded-lg py-1.5 text-center text-[0.65rem] font-semibold text-red-600 hover:bg-red-50/80 hover:underline"
                          onClick={() => {
                            if (!window.confirm(`确定删除该文件夹批改的全部 ${row.items.length} 条记录？`)) return;
                            const removed = deleteGradingHistoryGroup(row.groupKey);
                            removed.forEach((id) => void deleteHistoryImageBlob(id));
                            refreshHistory();
                          }}
                        >
                          删除整组
                        </button>
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}