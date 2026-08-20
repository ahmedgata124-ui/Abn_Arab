/**
 * استوديو ابن العرب AI - سكريبت التحكم التفاعلي (Modern SaaS JS)
 */

// 1. إدارة الحالة العامة للاستوديو (State Management)
const studioState = {
    currentTab: 'generate', // التبويب النشط افتراضياً
    currentQuality: 'FHD',  // الجودة المحددة افتراضياً
    costs: {
        FHD: 2,
        '4K': 4
    }
};

// 2. دالة التحويل بين التبويبات (Conditional Tab Switcher)
function switchTab(tabName) {
    studioState.currentTab = tabName;

    // إزالة التفعيل عن كافة الأزرار واللوحات
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

    // تفعيل الزر واللوحة المستهدفة
    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedPanel = document.getElementById(`panel-${tabName}`);

    if (selectedBtn) selectedBtn.classList.add('active');
    if (selectedPanel) selectedPanel.classList.add('active');

    // تحديث نصوص التكلفة بناءً على التبويب والجودة
    updateActionCost();
}

// 3. دالة التبديل بين خيارات الجودة (Toggle Quality Selector)
function setQuality(quality) {
    studioState.currentQuality = quality;

    const btnFhd = document.getElementById('btn-fhd');
    const btn4k = document.getElementById('btn-4k');

    if (quality === 'FHD') {
        btnFhd.classList.add('active');
        btn4k.classList.remove('active');
    } else {
        btn4k.classList.add('active');
        btnFhd.classList.remove('active');
    }

    // تحديث التكلفة فورياً على أزرار الإجراءات
    updateActionCost();
}

// 4. دالة تحديث تكلفة النقاط ديناميكياً على الأزرار
function updateActionCost() {
    const cost = studioState.costs[studioState.currentQuality];
    
    // تحديث زر توليد الصور
    const generateBtn = document.querySelector('#panel-generate .btn-primary');
    if (generateBtn) {
        generateBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> توليد الصورة الآن (تستهلك ${cost} نقاط)`;
    }

    // تحديث زر الأفاتار الناطق (يزيد بمقدار ضعف النقاط للـ 4K)
    const avatarBtn = document.querySelector('#panel-avatar .btn-primary');
    if (avatarBtn) {
        const avatarCost = cost * 2;
        avatarBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> إنشاء الأفاتار الناطق (تستهلك ${avatarCost} نقاط)`;
    }
}

// 5. تهيئة الأحداث والتفاعل بعد اكتمال تحميل الصفحة (DOM Ready)
document.addEventListener('DOMContentLoaded', () => {
    
    // ربط أزرار الـ Tabs بالأحداث بشكل نظيف وإزالة Inline Handlers
    document.querySelectorAll('.tab-btn').forEach(btn => {
        // استخراج اسم الـ Tab من خاصية data-tab أو الـ onclick القديم
        const tabName = btn.getAttribute('data-tab') || btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (tabName) {
            btn.setAttribute('data-tab', tabName);
            btn.removeAttribute('onclick'); // تنظيف الـ HTML
            btn.addEventListener('click', () => switchTab(tabName));
        }
    });

    // ربط محدد الجودة (Quality Switcher)
    const btnFhd = document.getElementById('btn-fhd');
    const btn4k = document.getElementById('btn-4k');

    if (btnFhd) {
        btnFhd.removeAttribute('onclick');
        btnFhd.addEventListener('click', () => setQuality('FHD'));
    }
    if (btn4k) {
        btn4k.removeAttribute('onclick');
        btn4k.addEventListener('click', () => setQuality('4K'));
    }

    // إضافة إمكانية رفع الملفات التفاعلية داخل الـ Upload Boxes
    setupFileUploads();
});

// 6. تحسين تجربة رفع الملفات (UX File Upload)
function setupFileUploads() {
    document.querySelectorAll('.upload-box').forEach(box => {
        // إنشاء input خفي للملفات ديناميكياً
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,video/*';
        fileInput.style.display = 'none';
        box.appendChild(fileInput);

        // فتح نافذة اختيار الملف عند الضغط على مربع الرفع
        box.addEventListener('click', () => fileInput.click());

        // تحديث نص المربع باسم الملف المرفوع
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const fileName = e.target.files[0].name;
                const textParagraph = box.querySelector('p');
                const icon = box.querySelector('i');

                if (textParagraph) textParagraph.textContent = `تم اختيار: ${fileName}`;
                if (icon) {
                    icon.className = 'fa-solid fa-circle-check';
                    icon.style.color = 'var(--status-success)';
                }
            }
        });
    });
}
