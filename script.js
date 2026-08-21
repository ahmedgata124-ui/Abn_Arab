// ==========================================
// 1. استيراد المكتبات (Three.js & Firebase)
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
// 2. إعدادات وتطبيق FIREBASE AUTH
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

// حالة التطبيق (App State)
const appState = {
    isLoggedIn: false,
    user: null,
    userCredits: 10,
    currentTab: 'generate',
    currentQuality: 'FHD',
    costs: { FHD: 2, '4K': 4 }
};

// تسجيل الدخول بجوجل
async function handleGoogleLogin() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("خطأ في تسجيل الدخول عبر Firebase:", error);
        alert("حدث خطأ أثناء فتح نافذة Google: " + error.message);
    }
}

// الاستماع لحالة تسجيل الدخول
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

// حماية عمليات التوليد والتحميل
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
// 3. SIMPLEX NOISE CODE (للثقب الأسود)
// ==========================================
const noiseChunk = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// ==========================================
// 4. THREE.JS SCENE SETUP
// ==========================================
const canvas = document.getElementById('bg-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, 50);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ==========================================
// 5. BLACK HOLE & AURA MESH
// ==========================================
const coreGroup = new THREE.Group();
scene.add(coreGroup);

const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const bhGeo = new THREE.SphereGeometry(4, 64, 64);
const blackHoleMesh = new THREE.Mesh(bhGeo, bhMat);
coreGroup.add(blackHoleMesh);

const auraMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 1.0 } },
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
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
            float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 4.0);
            gl_FragColor = vec4(vec3(1.0, 0.45, 0.1) * rim * uIntensity * 5.0, 1.0);
        }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending
});
coreGroup.add(new THREE.Mesh(new THREE.SphereGeometry(4.25, 64, 64), auraMat));

// ==========================================
// 6. ACCRETION DISK PARTICLES
// ==========================================
const instanceCount = 5000;
const streakGeo = new THREE.CylinderGeometry(0.01, 0.12, 2.2, 3);
streakGeo.rotateX(Math.PI / 2);

const diskMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0.1 },
        uCompression: { value: 1.0 },
        uIntensity: { value: 1.0 },
        uOrbitScale: { value: 1.0 }
    },
    vertexShader: `
        ${noiseChunk}
        uniform float uTime;
        uniform float uCompression;
        uniform float uIntensity;
        uniform float uOrbitScale;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
            vec4 instPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            float rOriginal = length(instPos.xz);
            float r = rOriginal * uCompression;
            float initialAngle = atan(instPos.z, instPos.x);
            float orbitalVelocity = (1.5 / sqrt(rOriginal)) * uOrbitScale;
            float currentAngle = initialAngle + (uTime * orbitalVelocity);
            vec3 morphedWorldPos = vec3(cos(currentAngle) * r, instPos.y, sin(currentAngle) * r);
            
            float noise = snoise(vec3(morphedWorldPos.x * 0.08, morphedWorldPos.z * 0.08, uTime * 0.2));
            morphedWorldPos.y += noise * 0.4;
            
            vec3 viewDir = normalize(cameraPosition - morphedWorldPos);
            vec3 orbitDir = normalize(vec3(-sin(currentAngle), 0.0, cos(currentAngle)));
            float doppler = dot(orbitDir, viewDir);
            
            vec3 hot = vec3(1.0, 0.95, 0.9);
            vec3 warm = vec3(1.0, 0.45, 0.1);
            vec3 cool = vec3(0.1, 0.35, 1.0);
            
            vec3 color = mix(cool, warm, smoothstep(45.0, 12.0, r));
            color = mix(color, hot, smoothstep(10.0, 4.0, r));
            vColor = color * (1.3 + doppler * 0.7) * uIntensity;
            vOpacity = (smoothstep(3.8, 5.5, r)) * (1.0 - smoothstep(38.0, 48.0, r)) * 0.8;
            
            float deltaAngle = currentAngle - initialAngle;
            float c = cos(deltaAngle); float s = sin(deltaAngle);
            mat3 rotY = mat3(c, 0, s, 0, 1, 0, -s, 0, c);
            vec3 localPos = (instanceMatrix * vec4(position, 1.0)).xyz;
            vec3 rotatedLocalPos = rotY * localPos;
            
            gl_Position = projectionMatrix * viewMatrix * vec4(morphedWorldPos + rotatedLocalPos, 1.0);
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

const instancedDisk = new THREE.InstancedMesh(streakGeo, diskMaterial, instanceCount);
const dummy = new THREE.Object3D();

for (let i = 0; i < instanceCount; i++) {
    const r = 5 + Math.pow(Math.random(), 1.3) * 40;
    const angle = Math.random() * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * r, (Math.random() - 0.5) * (8 / r), Math.sin(angle) * r);
    dummy.lookAt(dummy.position.x + Math.sin(angle), dummy.position.y, dummy.position.z - Math.cos(angle));
    dummy.updateMatrix();
    instancedDisk.setMatrixAt(i, dummy.matrix);
}
scene.add(instancedDisk);

// ==========================================
// 7. ANIMATION & RENDER LOOP
// ==========================================
const clock = new THREE.Clock();
let speedMultiplier = 0.4;

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    
    diskMaterial.uniforms.uTime.value = time * speedMultiplier;
    auraMat.uniforms.uTime.value = time;
    
    coreGroup.rotation.y = time * 0.1;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==========================================
// 8. INTRO CLICK INTERACTION
// ==========================================
const overlay = document.getElementById('blackhole-overlay');
const whiteCore = document.getElementById('white-core');
const whiteFlash = document.getElementById('white-flash');
let isClicked = false;

if (overlay) {
    overlay.addEventListener('click', () => {
        if (isClicked) return;
        isClicked = true;

        if (whiteCore) {
            whiteCore.style.opacity = '1';
            whiteCore.style.width = '14px';
            whiteCore.style.height = '14px';
        }

        let accelerationInterval = setInterval(() => {
            speedMultiplier += 0.8;
            diskMaterial.uniforms.uOrbitScale.value += 0.5;
        }, 50);

        setTimeout(() => {
            clearInterval(accelerationInterval);
            if (whiteCore) {
                whiteCore.style.transition = 'width 0.25s ease-in, height 0.25s ease-in';
                whiteCore.style.width = '250vw';
                whiteCore.style.height = '250vh';
            }
            document.body.classList.add('screen-shake');
        }, 600);

        setTimeout(() => {
            if (whiteFlash) whiteFlash.style.opacity = '1';
            
            setTimeout(() => {
                overlay.style.opacity = '0';
                overlay.style.visibility = 'hidden';
                document.body.classList.remove('screen-shake');

                setTimeout(() => {
                    if (whiteFlash) whiteFlash.style.opacity = '0';
                }, 300);

            }, 400);
        }, 850);
    });
}

// ==========================================
// 9. UI CONTROL FUNCTIONS (TABS & QUALITY)
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
        if (box.querySelector('input[type="file"]')) return; // لمنع التكرار
        
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

// ==========================================
// 10. INITIALIZATION
// ==========================================
function initUIEvents() {
    // ربط زر تسجيل الدخول
    const loginBtn = document.getElementById('btn-google-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleGoogleLogin);
    }

    // ربط التبويبات
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const tabName = btn.getAttribute('data-tab');
        if (tabName) {
            btn.addEventListener('click', () => switchTab(tabName));
        }
    });

    // ربط أزرار الجودة
    document.getElementById('btn-fhd')?.addEventListener('click', () => setQuality('FHD'));
    document.getElementById('btn-4k')?.addEventListener('click', () => setQuality('4K'));

    // ربط أزرار التوليد والتنفيذ
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

// تشغيل الأحداث فور جاهزية الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUIEvents);
} else {
    initUIEvents();
}
