// ==============================// ==========================================
// 1. IMPORT THREE.JS & FIREBASE
// ==========================================
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// 2. FIREBASE AUTHENTICATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC2Dbppgjk09edIskPX5OM-ujoqKXLJRDA",
  authDomain: "abn-arab-ai.firebaseapp.com",
  projectId: "abn-arab-ai",
  storageBucket: "abn-arab-ai.firebasestorage.app",
  messagingSenderId: "863813080286",
  appId: "1:863813080286:web:5fd4e1d46380992fdede4f",
  measurementId: "G-XYNDV35VB2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const appState = {
    isLoggedIn: false,
    user: null,
    userCredits: 10,
    currentTab: 'generate',
    currentQuality: 'FHD',
    costs: { FHD: 2, '4K': 4 }
};

async function handleGoogleLogin() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("خطأ في تسجيل الدخول عبر Firebase:", error);
        alert("حدث خطأ أثناء فتح نافذة Google: " + error.message);
    }
}

onAuthStateChanged(auth, (user) => {
    const loginBtn = document.getElementById('btn-google-login');
    if (user) {
        appState.isLoggedIn = true;
        appState.user = user;

        if (loginBtn) {
            loginBtn.className = 'btn-primary';
            loginBtn.innerHTML = `
                <img src="${user.photoURL}" style="width:22px; height:22px; border-radius:50%; object-fit:cover;">
                <span>${user.displayName ? user.displayName.split(' ')[0] : 'المستخدم'}</span>
            `;
        }
    } else {
        appState.isLoggedIn = false;
        appState.user = null;

        if (loginBtn) {
            loginBtn.className = 'btn-secondary';
            loginBtn.innerHTML = `<i class="fa-brands fa-google"></i> تسجيل الدخول بجوجل`;
        }
    }
});

function checkAuthAndExecute(actionCallback) {
    if (!appState.isLoggedIn) {
        alert('عفواً! يجب تسجيل الدخول بجوجل أولاً لتتمكن من استخدام الاستوديو.');
        handleGoogleLogin();
        return false;
    }
    
    const requiredCost = appState.currentTab === 'avatar' 
        ? appState.costs[appState.currentQuality] * 2 
        : appState.costs[appState.currentQuality];

    if (appState.userCredits < requiredCost) {
        alert(`رصيدك غير كافٍ. تحتاج إلى ${requiredCost} نقاط ورصيدك الحالي ${appState.userCredits} نقاط فقط.`);
        return false;
    }

    actionCallback(requiredCost);
    return true;
}

// ==========================================
// 3. THREE.JS EXACT IMAGE-MATCHING BLACK HOLE
// ==========================================
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();

// إعداد الكاميرا بزاوية مائلة تطابق زاوية رؤية الصورة
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 18, 22);
camera.lookAt(0, -1, 0);

const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true, 
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// الثقب الأسود في المركز
const bhRadius = 2.8;
const bhGeo = new THREE.SphereGeometry(bhRadius, 64, 64);
const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const blackHoleMesh = new THREE.Mesh(bhGeo, bhMat);
scene.add(blackHoleMesh);

// هالة ضوئية بيضاء حول المركز
const innerAuraMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-(modelViewMatrix * vec4(position, 1.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
            float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 3.0);
            gl_FragColor = vec4(vec3(1.0, 1.0, 0.95) * rim * 4.0, rim);
        }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(bhRadius * 1.05, 64, 64), innerAuraMat));

// ==========================================
// 4. ACCRETION STREAKS (مطابقة تامّة لألوان وأقواس الصورة)
// ==========================================
const streakCount = 4500;
const instancedGeo = new THREE.CylinderGeometry(0.02, 0.08, 1.2, 4);
instancedGeo.rotateX(Math.PI / 2); // استطالة الشرائط لتصبح خطوطاً ممتدة

// ألوان متدرجة: أبيض في الداخل -> أصفر/برتقالي في الوسط -> أزرق/بنفسجي في الخارجي
const diskMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uSpeedScale: { value: 1.0 }
    },
    vertexShader: `
        uniform float uTime;
        uniform float uSpeedScale;
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
            vec4 instMatrix = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float r = length(instMatrix.xz);
            float initialAngle = atan(instMatrix.z, instMatrix.x);
            
            float speed = (2.2 / sqrt(r)) * uSpeedScale;
            float angle = initialAngle + uTime * speed;
            
            vec3 worldPos = vec3(cos(angle) * r, instMatrix.y, sin(angle) * r);
            
            // تدرج الألوان المتطابق مع الصورة
            vec3 cWhite = vec3(1.0, 1.0, 1.0);
            vec3 cYellow = vec3(1.0, 0.7, 0.2);
            vec3 cOrange = vec3(0.9, 0.35, 0.1);
            vec3 cBlue = vec3(0.2, 0.4, 0.95);
            vec3 cPurple = vec3(0.4, 0.2, 0.8);
            
            vec3 finalColor;
            float normR = (r - 3.0) / 15.0; // تطبيع النصف قطر
            
            if (normR < 0.2) {
                finalColor = mix(cWhite, cYellow, normR * 5.0);
            } else if (normR < 0.5) {
                finalColor = mix(cYellow, cOrange, (normR - 0.2) * 3.33);
            } else if (normR < 0.8) {
                finalColor = mix(cOrange, cBlue, (normR - 0.5) * 3.33);
            } else {
                finalColor = mix(cBlue, cPurple, (normR - 0.8) * 5.0);
            }
            
            vColor = finalColor * 1.5;
            vOpacity = smoothstep(2.9, 3.5, r) * (1.0 - smoothstep(16.0, 19.0, r));
            
            // دوران الشرائط حول المركز
            float deltaAngle = angle - initialAngle;
            float c = cos(deltaAngle); float s = sin(deltaAngle);
            mat3 rotY = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
            
            vec3 localPos = (instanceMatrix * vec4(position, 1.0)).xyz;
            vec3 transformed = rotY * localPos;

            gl_Position = projectionMatrix * viewMatrix * vec4(worldPos + transformed, 1.0);
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
            gl_FragColor = vec4(vColor, vOpacity);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const instancedMesh = new THREE.InstancedMesh(instancedGeo, diskMaterial, streakCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < streakCount; i++) {
    // توزيع الجسيمات بالقرب التام من حافة الثقب
    const r = 3.0 + Math.pow(Math.random(), 1.4) * 15.0;
    const angle = Math.random() * Math.PI * 2;
    
    dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * 0.15, Math.sin(angle) * r);
    dummy.rotation.y = -angle;
    dummy.scale.set(1.0, 1.0, Math.random() * 1.5 + 0.5);
    dummy.updateMatrix();
    
    instancedMesh.setMatrixAt(i, dummy.matrix);
}
scene.add(instancedMesh);

// ==========================================
// 5. ANIMATION LOOP & RESPONSIVE RESIZE
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    diskMaterial.uniforms.uTime.value = time;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ==========================================
// 6. INTRO CLICK TRANSITION WITH DIRECT AUDIO LINKS
// ==========================================
const overlay = document.getElementById('blackhole-overlay');
const whiteCore = document.getElementById('white-core');
const bgSpaceSound = document.getElementById('bg-space-sound');
const transitionSound = document.getElementById('transition-sound');

let isClicked = false;

// تشغيل صوت خلفية الفضاء فور تفاعل المستخدم مع الصفحة
const startBgAudio = () => {
    if (bgSpaceSound && bgSpaceSound.paused) {
        bgSpaceSound.volume = 0.5;
        bgSpaceSound.play().catch(() => {});
    }
};
window.addEventListener('click', startBgAudio, { once: true });
window.addEventListener('touchstart', startBgAudio, { once: true });

if (overlay) {
    overlay.addEventListener('click', () => {
        if (isClicked) return;
        isClicked = true;

        // 1. تشغيل صوت الانتقال الانفجاري عبر الرابط المباشر
        if (transitionSound) {
            transitionSound.currentTime = 0;
            transitionSound.volume = 0.9;
            transitionSound.play().catch(() => {});
        }

        // 2. خفض صوت الخلفية الكونية تدريجياً (Fade out)
        if (bgSpaceSound) {
            let fadeAudio = setInterval(() => {
                if (bgSpaceSound.volume > 0.05) {
                    bgSpaceSound.volume -= 0.05;
                } else {
                    bgSpaceSound.pause();
                    clearInterval(fadeAudio);
                }
            }, 50);
        }

        // 3. توسيع الكرة البيضاء بالتدريج وبسرعة لتبتلع الشاشة
        if (whiteCore) {
            whiteCore.style.opacity = '1';
            whiteCore.style.width = '10px';
            whiteCore.style.height = '10px';
            
            document.body.classList.add('screen-shake');

            setTimeout(() => {
                whiteCore.style.width = '350vw';
                whiteCore.style.height = '350vh';
            }, 50);
        }

        // تسريع دوران الأقواس
        let speedBoost = 1.0;
        let accel = setInterval(() => {
            speedBoost += 1.5;
            diskMaterial.uniforms.uSpeedScale.value = speedBoost;
        }, 30);

        // اختفاء الانيميشن بالكامل
        setTimeout(() => {
            clearInterval(accel);
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            document.body.classList.remove('screen-shake');
        }, 650);
    });
}

// ==========================================
// 7. STUDIO TABS & CONTROLS INTERACTION
// ==========================================
function switchTab(tabName) {
    appState.currentTab = tabName;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const selectedPanel = document.getElementById(`panel-${tabName}`);

    if (selectedBtn) selectedBtn.classList.add('active');
    if (selectedPanel) selectedPanel.classList.add('active');

    updateActionCost();
}

function setQuality(quality) {
    appState.currentQuality = quality;

    const btnFhd = document.getElementById('btn-fhd');
    const btn4k = document.getElementById('btn-4k');

    if (quality === 'FHD') {
        btnFhd?.classList.add('active');
        btn4k?.classList.remove('active');
    } else {
        btn4k?.classList.add('active');
        btnFhd?.classList.remove('active');
    }

    updateActionCost();
}

function updateActionCost() {
    const cost = appState.costs[appState.currentQuality];
    
    const generateBtn = document.querySelector('#panel-generate .btn-primary');
    if (generateBtn) {
        generateBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> توليد الصورة الآن (تستهلك ${cost} نقاط)`;
    }

    const avatarBtn = document.querySelector('#panel-avatar .btn-primary');
    if (avatarBtn) {
        avatarBtn.innerHTML = `<i class="fa-solid fa-microphone"></i> إنشاء الأفاتار الناطق (تستهلك ${cost * 2} نقاط)`;
    }
}

function setupFileUploads() {
    document.querySelectorAll('.upload-box').forEach(box => {
        if (box.querySelector('input[type="file"]')) return;
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,video/*';
        fileInput.style.display = 'none';
        box.appendChild(fileInput);

        box.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const fileName = e.target.files[0].name;
                const textParagraph = box.querySelector('p');
                const icon = box.querySelector('i');

                if (textParagraph) textParagraph.textContent = `تم رفع: ${fileName}`;
                if (icon) {
                    icon.className = 'fa-solid fa-circle-check';
                    icon.style.color = 'var(--status-success)';
                }
            }
        });
    });
}

function initUIEvents() {
    const loginBtn = document.getElementById('btn-google-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleGoogleLogin);
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        const tabName = btn.getAttribute('data-tab');
        if (tabName) {
            btn.addEventListener('click', () => switchTab(tabName));
        }
    });

    document.getElementById('btn-fhd')?.addEventListener('click', () => setQuality('FHD'));
    document.getElementById('btn-4k')?.addEventListener('click', () => setQuality('4K'));

    document.querySelectorAll('.studio-panel-content .btn-primary').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            checkAuthAndExecute((costDeducted) => {
                appState.userCredits -= costDeducted;
                
                const creditsBadge = document.getElementById('user-credits');
                if (creditsBadge) {
                    creditsBadge.innerText = `${appState.userCredits} نقاط متبقية`;
                }

                alert(`تم خصم ${costDeducted} نقاط بنجاح! جاري تنفيذ طلبك.`);
            });
        });
    });

    setupFileUploads();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUIEvents);
} else {
    initUIEvents();
}
