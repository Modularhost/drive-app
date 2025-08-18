import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';

// Configuración de Firebase (la misma que en script.js)
const firebaseConfig = {
    apiKey: "AIzaSyDuF7p0X6N8IE19Bqt78LQAp805tMl84Ds",
    authDomain: "modular-app-16bd6.firebaseapp.com",
    projectId: "modular-app-16bd6",
    storageBucket: "modular-app-16bd6.firebasestorage.app",
    messagingSenderId: "1006327040835",
    appId: "1:1006327040835:web:b8b4f510da46514a3d3df6",
    measurementId: "G-GVKBWL9GT9"
};

// Inicializar Firebase
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase inicializado correctamente');
} else {
    app = getApp();
    console.log('Firebase ya estaba inicializado');
}

const storage = getStorage(app);

// Elementos del DOM con nombres específicos para presupuesto
const toggleModeBtn = document.getElementById('toggle-mode-presupuesto');
const body = document.body;
const uploadZone = document.getElementById('upload-zone-presupuesto');
const fileInput = document.getElementById('file-input-presupuesto');
const selectFilesBtn = document.getElementById('select-files-presupuesto');
const fileList = document.getElementById('file-list-presupuesto');
const message = document.getElementById('message-presupuesto');

let selectedFiles = [];

// Configuración de modo oscuro/claro para presupuesto
const savedMode = localStorage.getItem('presupuesto-theme') || 'dark';
if (savedMode === 'light') {
    body.classList.remove('dark-mode');
    toggleModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
}

toggleModeBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    toggleModeBtn.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    localStorage.setItem('presupuesto-theme', isDark ? 'dark' : 'light');
});

// Funciones de utilidad para presupuesto
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(file) {
    const type = file.type.toLowerCase();
    if (type.includes('pdf')) return 'fas fa-file-pdf pdf';
    if (type.includes('image')) return 'fas fa-image image';
    return 'fas fa-file';
}

function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message-presupuesto ${type} show`;
    setTimeout(() => {
        message.classList.remove('show');
    }, 5000);
}

function validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    if (file.size > maxSize) {
        return `El archivo ${file.name} es demasiado grande. Máximo 10MB permitido.`;
    }
    
    if (!allowedTypes.includes(file.type.toLowerCase())) {
        return `El tipo de archivo ${file.name} no está permitido.`;
    }
    
    return null;
}

function addFilesToList(files) {
    Array.from(files).forEach(file => {
        const error = validateFile(file);
        if (error) {
            showMessage(error, 'error');
            return;
        }

        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push({
                file: file,
                id: Date.now() + Math.random(),
                uploaded: false,
                uploading: false,
                progress: 0,
                url: null
            });
        }
    });
    
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = selectedFiles.map(fileObj => `
        <div class="file-item-presupuesto" data-id="${fileObj.id}">
            <div class="file-info-presupuesto">
                <i class="file-icon-presupuesto ${getFileIcon(fileObj.file)}"></i>
                <div class="file-details-presupuesto">
                    <h4>${fileObj.file.name}</h4>
                    <p>${formatFileSize(fileObj.file.size)} • ${fileObj.file.type}</p>
                    ${fileObj.uploading ? `
                        <div class="progress-bar-presupuesto">
                            <div class="progress-fill-presupuesto" style="width: ${fileObj.progress}%"></div>
                        </div>
                    ` : ''}
                    ${fileObj.uploaded && fileObj.url ? `
                        <p style="color: var(--success-color); margin-top: 0.5rem;">
                            <i class="fas fa-check"></i> Presupuesto subido exitosamente
                        </p>
                    ` : ''}
                </div>
            </div>
            <div class="file-actions-presupuesto">
                ${!fileObj.uploaded && !fileObj.uploading ? `
                    <button class="btn-small-presupuesto btn-upload-presupuesto" onclick="uploadFilePresupuesto('${fileObj.id}')">
                        <i class="fas fa-cloud-upload-alt"></i> Subir
                    </button>
                ` : ''}
                ${fileObj.uploaded && fileObj.url ? `
                    <button class="btn-small-presupuesto btn-upload-presupuesto" onclick="copyUrlPresupuesto('${fileObj.url}')">
                        <i class="fas fa-copy"></i> Copiar URL
                    </button>
                ` : ''}
                ${!fileObj.uploading ? `
                    <button class="btn-small-presupuesto btn-remove-presupuesto" onclick="removeFilePresupuesto('${fileObj.id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Funciones globales para presupuesto
window.uploadFilePresupuesto = async function(fileId) {
    const fileObj = selectedFiles.find(f => f.id === fileId);
    if (!fileObj || fileObj.uploading || fileObj.uploaded) return;

    fileObj.uploading = true;
    renderFileList();

    try {
        // Crear referencia específica para presupuestos
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `presupuesto_${timestamp}_${fileObj.file.name}`;
        const storageRef = ref(storage, `presupuestos/${fileName}`);

        // Subir archivo con seguimiento de progreso
        const uploadTask = uploadBytesResumable(storageRef, fileObj.file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                fileObj.progress = Math.round(progress);
                renderFileList();
            },
            (error) => {
                console.error('Error al subir presupuesto:', error);
                showMessage(`Error al subir ${fileObj.file.name}: ${error.message}`, 'error');
                fileObj.uploading = false;
                renderFileList();
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    fileObj.uploaded = true;
                    fileObj.uploading = false;
                    fileObj.url = downloadURL;
                    showMessage(`Presupuesto ${fileObj.file.name} subido exitosamente!`);
                    renderFileList();
                    
                    // Guardar información del presupuesto en localStorage para referencia
                    const presupuestos = JSON.parse(localStorage.getItem('presupuestos-subidos') || '[]');
                    presupuestos.push({
                        id: fileObj.id,
                        name: fileObj.file.name,
                        url: downloadURL,
                        uploadDate: new Date().toISOString(),
                        size: fileObj.file.size,
                        type: fileObj.file.type
                    });
                    localStorage.setItem('presupuestos-subidos', JSON.stringify(presupuestos));
                } catch (error) {
                    console.error('Error al obtener URL del presupuesto:', error);
                    showMessage(`Error al obtener URL de ${fileObj.file.name}`, 'error');
                }
            }
        );
    } catch (error) {
        console.error('Error al iniciar subida del presupuesto:', error);
        showMessage(`Error al iniciar subida de ${fileObj.file.name}`, 'error');
        fileObj.uploading = false;
        renderFileList();
    }
};

window.removeFilePresupuesto = function(fileId) {
    selectedFiles = selectedFiles.filter(f => f.id !== fileId);
    renderFileList();
    showMessage('Archivo de presupuesto eliminado de la lista');
};

window.copyUrlPresupuesto = async function(url) {
    try {
        await navigator.clipboard.writeText(url);
        showMessage('URL del presupuesto copiada al portapapeles!');
    } catch (error) {
        showMessage('Error al copiar URL del presupuesto', 'error');
        // Fallback para navegadores que no soportan clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showMessage('URL copiada (fallback method)');
    }
};

// Event listeners específicos para presupuesto
selectFilesBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    addFilesToList(e.target.files);
    showMessage(`${e.target.files.length} archivo(s) de presupuesto seleccionado(s)`);
});

// Drag and drop para presupuestos
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    addFilesToList(e.dataTransfer.files);
    showMessage(`${e.dataTransfer.files.length} archivo(s) de presupuesto arrastrado(s)`);
});

uploadZone.addEventListener('click', (e) => {
    if (e.target === uploadZone || e.target.closest('i, h3, p')) {
        fileInput.click();
    }
});

// Función para limpiar archivos subidos (opcional)
window.clearUploadedFiles = function() {
    selectedFiles = selectedFiles.filter(f => !f.uploaded);
    renderFileList();
    showMessage('Archivos subidos limpiados de la lista');
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de Presupuesto iniciado correctamente');
    showMessage('Módulo de presupuesto listo para usar');
});