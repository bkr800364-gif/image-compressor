/* =========================================
   ImagePro — Professional Image Compressor
   Image processing runs locally in the browser
========================================= */

"use strict";

/* ---------- Select elements ---------- */

const $ = (selector) => document.querySelector(selector);

const imageInput = $("#imageInput");
const uploadZone = $("#uploadZone");
const selectImageBtn = $("#selectImageBtn");
const workspace = $("#workspace");

const removeImageBtn = $("#removeImageBtn");
const outputFormat = $("#outputFormat");
const qualityRange = $("#qualityRange");
const qualityValue = $("#qualityValue");

const compressBtn = $("#compressBtn");
const resetSettingsBtn = $("#resetSettingsBtn");

const statusMessage = $("#statusMessage");

const originalPreview = $("#originalPreview");
const compressedPreview = $("#compressedPreview");

const fileName = $("#fileName");
const originalSize = $("#originalSize");
const imageDimensions = $("#imageDimensions");

const comparisonGrid = $("#comparisonGrid");
const compressionResult = $("#compressionResult");

const originalSizeBadge = $("#originalSizeBadge");
const compressedSizeBadge = $("#compressedSizeBadge");

const resultOriginalSize = $("#resultOriginalSize");
const resultCompressedSize = $("#resultCompressedSize");
const savedPercentage = $("#savedPercentage");

const downloadBtn = $("#downloadBtn");
const resultNote = $("#resultNote");

const themeToggle = $("#themeToggle");
const currentYear = $("#currentYear");

/* ---------- Application state ---------- */

const MAX_FILE_SIZE = 20 * 1024 * 1024;

let originalFile = null;
let originalImageUrl = null;
let compressedImageUrl = null;

let imageWidth = 0;
let imageHeight = 0;

let compressionInProgress = false;
let operationId = 0;

/* ---------- General helpers ---------- */

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "غير معروف";
  }

  if (bytes === 0) {
    return "0 بايت";
  }

  const units = ["بايت", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / Math.pow(1024, unitIndex);

  return `${value.toLocaleString("ar-EG", {
    maximumFractionDigits: unitIndex === 0 ? 0 : 2,
  })} ${units[unitIndex]}`;
}

function showMessage(message, type = "success") {
  statusMessage.textContent = message;

  if (type === "error") {
    statusMessage.style.color = "var(--danger)";
  } else {
    statusMessage.style.color = "var(--success)";
  }
}

function clearMessage() {
  statusMessage.textContent = "";
}

function revokeUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

function getExtension(mimeType) {
  const extensions = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
  };

  return extensions[mimeType] || "png";
}

function getSafeFileName(name) {
  const baseName = name.replace(/\.[^/.]+$/, "");
  const safeName = baseName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .trim()
    .slice(0, 100);

  return safeName || "image";
}

function setCompressionState(isRunning) {
  compressionInProgress = isRunning;
  compressBtn.disabled = isRunning;
  selectImageBtn.disabled = isRunning;
  removeImageBtn.disabled = isRunning;
  outputFormat.disabled = isRunning;
  qualityRange.disabled = isRunning;
  resetSettingsBtn.disabled = isRunning;

  compressBtn.innerHTML = isRunning
    ? "جارٍ ضغط الصورة..."
    : "ضغط الصورة الآن <span>→</span>";
}

/* ---------- Result management ---------- */

function clearCompressedResult() {
  revokeUrl(compressedImageUrl);
  compressedImageUrl = null;

  compressedPreview.removeAttribute("src");
  downloadBtn.removeAttribute("href");

  comparisonGrid.hidden = true;
  compressionResult.hidden = true;
  resultNote.textContent = "";

  compressedSizeBadge.textContent = "—";
  resultCompressedSize.textContent = "—";
  savedPercentage.textContent = "—";
}

function resetWorkspace() {
  operationId++;

  setCompressionState(false);

  originalFile = null;
  imageWidth = 0;
  imageHeight = 0;

  revokeUrl(originalImageUrl);
  originalImageUrl = null;

  clearCompressedResult();

  imageInput.value = "";

  originalPreview.removeAttribute("src");

  fileName.textContent = "—";
  originalSize.textContent = "الحجم الأصلي: —";
  imageDimensions.textContent = "الأبعاد: —";

  originalSizeBadge.textContent = "—";

  workspace.hidden = true;
  uploadZone.hidden = false;

  uploadZone.classList.remove("drag-over");

  clearMessage();
}

/* ---------- Image loading ---------- */

async function loadImageFile(file) {
  if (compressionInProgress) {
    showMessage(
      "انتظر حتى تنتهي العملية الحالية قبل اختيار صورة أخرى.",
      "error",
    );
    return;
  }

  if (!file) {
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    showMessage("يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.", "error");
    return;
  }

  if (file.size === 0) {
    showMessage("الملف فارغ، اختر صورة أخرى.", "error");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showMessage("حجم الصورة أكبر من 20 ميجابايت. اختر صورة أصغر.", "error");
    return;
  }

  const currentOperation = ++operationId;

  revokeUrl(originalImageUrl);
  originalImageUrl = null;

  clearCompressedResult();

  clearMessage();

  const newImageUrl = URL.createObjectURL(file);
  originalImageUrl = newImageUrl;

  try {
    const image = new Image();

    image.src = newImageUrl;

    await image.decode();

    if (currentOperation !== operationId) {
      return;
    }

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("تعذر قراءة أبعاد الصورة.");
    }

    originalFile = file;
    imageWidth = image.naturalWidth;
    imageHeight = image.naturalHeight;

    fileName.textContent = file.name;
    originalSize.textContent = `الحجم الأصلي: ${formatBytes(file.size)}`;

    imageDimensions.textContent = `الأبعاد: ${imageWidth.toLocaleString("ar-EG")} × ${imageHeight.toLocaleString(
      "ar-EG",
    )} بكسل`;

    originalSizeBadge.textContent = formatBytes(file.size);

    originalPreview.src = originalImageUrl;

    workspace.hidden = false;
    uploadZone.hidden = true;

    showMessage("تم تحميل الصورة بنجاح.");
  } catch (error) {
    if (currentOperation === operationId) {
      revokeUrl(originalImageUrl);
      originalImageUrl = null;

      originalFile = null;

      workspace.hidden = true;
      uploadZone.hidden = false;

      showMessage("تعذر فتح الصورة. جرّب ملفًا آخر صالحًا.", "error");
    }
  }
}

/* ---------- File selection ---------- */

selectImageBtn.addEventListener("click", (event) => {
  event.stopPropagation();

  if (!compressionInProgress) {
    imageInput.click();
  }
});

uploadZone.addEventListener("click", (event) => {
  if (event.target === selectImageBtn || event.target.closest("button")) {
    return;
  }

  if (!compressionInProgress) {
    imageInput.click();
  }
});

uploadZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();

    if (!compressionInProgress) {
      imageInput.click();
    }
  }
});

imageInput.addEventListener("change", async () => {
  const file = imageInput.files?.[0];

  if (file) {
    await loadImageFile(file);
  }
});

/* ---------- Drag and drop ---------- */

uploadZone.addEventListener("dragover", (event) => {
  event.preventDefault();

  if (!compressionInProgress) {
    uploadZone.classList.add("drag-over");
  }
});

uploadZone.addEventListener("dragleave", (event) => {
  if (!uploadZone.contains(event.relatedTarget)) {
    uploadZone.classList.remove("drag-over");
  }
});

uploadZone.addEventListener("drop", async (event) => {
  event.preventDefault();

  uploadZone.classList.remove("drag-over");

  if (compressionInProgress) {
    return;
  }

  const file = event.dataTransfer?.files?.[0];

  if (file) {
    imageInput.value = "";
    await loadImageFile(file);
  }
});

/* ---------- Quality control ---------- */

qualityRange.addEventListener("input", () => {
  qualityValue.textContent = `${qualityRange.value}%`;

  if (compressedImageUrl) {
    clearCompressedResult();
    showMessage("تغيّرت الإعدادات. اضغط الصورة مرة أخرى.");
  }
});

outputFormat.addEventListener("change", () => {
  if (compressedImageUrl) {
    clearCompressedResult();
    showMessage("تغيّرت الصيغة. اضغط الصورة مرة أخرى.");
  }
});

/* ---------- Canvas image compression ---------- */

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("تعذر إنشاء الصورة المضغوطة."));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

async function compressImage() {
  if (compressionInProgress) {
    return;
  }

  if (!originalFile || !originalImageUrl) {
    showMessage("اختر صورة أولًا قبل الضغط.", "error");
    return;
  }

  const currentOperation = operationId;

  clearCompressedResult();
  clearMessage();

  setCompressionState(true);

  try {
    const image = new Image();

    image.src = originalImageUrl;

    await image.decode();

    if (currentOperation !== operationId) {
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", {
      alpha: true,
    });

    if (!context) {
      throw new Error("المتصفح لا يدعم معالجة الصور المطلوبة.");
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const mimeType = outputFormat.value;
    const quality = Number(qualityRange.value) / 100;

    /*
      JPEG لا يدعم الشفافية.
      نستخدم خلفية بيضاء عند التصدير إلى JPEG.
    */

    if (mimeType === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, mimeType, quality);

    if (currentOperation !== operationId) {
      return;
    }

    /*
      بعض المتصفحات قد لا تدعم الصيغة المطلوبة
      وتعيد الصورة بصيغة PNG بدلًا منها.
    */

    const actualMimeType = blob.type || "image/png";

    compressedImageUrl = URL.createObjectURL(blob);

    compressedPreview.src = compressedImageUrl;

    const originalBytes = originalFile.size;
    const compressedBytes = blob.size;

    const difference = originalBytes - compressedBytes;
    const percentage =
      originalBytes > 0 ? (difference / originalBytes) * 100 : 0;

    const reduction = Math.max(0, percentage);
    const extension = getExtension(actualMimeType);
    const safeName = getSafeFileName(originalFile.name);

    downloadBtn.href = compressedImageUrl;

    downloadBtn.download = `${safeName}-compressed.${extension}`;

    originalSizeBadge.textContent = formatBytes(originalBytes);

    compressedSizeBadge.textContent = formatBytes(compressedBytes);

    resultOriginalSize.textContent = formatBytes(originalBytes);

    resultCompressedSize.textContent = formatBytes(compressedBytes);

    if (difference > 0) {
      savedPercentage.textContent = `${reduction.toLocaleString("ar-EG", {
        maximumFractionDigits: 1,
      })}%`;

      resultNote.textContent = `تم تقليل الحجم بمقدار ${formatBytes(difference)}.`;
    } else if (difference < 0) {
      savedPercentage.textContent = `+${Math.abs(percentage).toLocaleString(
        "ar-EG",
        {
          maximumFractionDigits: 1,
        },
      )}%`;

      resultNote.textContent =
        "زاد حجم الملف الناتج. جرّب جودة أقل أو صيغة أخرى.";
    } else {
      savedPercentage.textContent = "0%";

      resultNote.textContent =
        "لم يتغير حجم الملف. جرّب صيغة أخرى أو جودة أقل.";
    }

    comparisonGrid.hidden = false;
    compressionResult.hidden = false;

    showMessage("تم ضغط الصورة بنجاح. يمكنك معاينتها وتنزيلها.");

    canvas.width = 0;
    canvas.height = 0;
  } catch (error) {
    clearCompressedResult();

    showMessage(
      error.message || "حدث خطأ أثناء ضغط الصورة. حاول مجددًا.",
      "error",
    );
  } finally {
    setCompressionState(false);
  }
}

compressBtn.addEventListener("click", compressImage);

/* ---------- Reset settings ---------- */

resetSettingsBtn.addEventListener("click", () => {
  if (compressionInProgress) {
    return;
  }

  outputFormat.value = "image/webp";
  qualityRange.value = "80";
  qualityValue.textContent = "80%";

  clearCompressedResult();

  if (originalFile) {
    showMessage("تمت إعادة الإعدادات. اضغط الصورة لتطبيقها.");
  } else {
    clearMessage();
  }
});

/* ---------- Remove image ---------- */

removeImageBtn.addEventListener("click", () => {
  if (compressionInProgress) {
    return;
  }

  resetWorkspace();

  showMessage("تمت إزالة الصورة. اختر صورة جديدة للبدء.");
});

/* ---------- Dark mode ---------- */

function updateThemeButton() {
  const darkMode = document.body.classList.contains("dark-mode");

  themeToggle.textContent = darkMode ? "☀️" : "🌙";

  themeToggle.setAttribute(
    "aria-label",
    darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن",
  );

  themeToggle.title = darkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن";
}

function loadSavedTheme() {
  try {
    const savedTheme = localStorage.getItem("imagepro-theme");

    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
    }
  } catch (error) {
    // يظل الموقع قابلًا للاستخدام إذا تعذر الوصول للتخزين.
  }

  updateThemeButton();
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");

  const darkMode = document.body.classList.contains("dark-mode");

  try {
    localStorage.setItem("imagepro-theme", darkMode ? "dark" : "light");
  } catch (error) {
    // يعمل تغيير المظهر حتى عند تعذر حفظ الاختيار.
  }

  updateThemeButton();
});

/* ---------- Initial setup ---------- */

function initializeApp() {
  qualityValue.textContent = `${qualityRange.value}%`;

  currentYear.textContent = new Date().getFullYear();

  loadSavedTheme();

  workspace.hidden = true;
  comparisonGrid.hidden = true;
  compressionResult.hidden = true;

  console.log("ImagePro is ready.");
}

initializeApp();

/* ---------- Cleanup ---------- */

window.addEventListener("pagehide", () => {
  revokeUrl(originalImageUrl);
  revokeUrl(compressedImageUrl);
});
