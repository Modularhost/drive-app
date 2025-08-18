 import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
        import { 
            getStorage, 
            ref, 
            uploadBytesResumable, 
            getDownloadURL 
        } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-storage.js';

        // Configuración de Firebase (la misma que en tu script.js)
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
        } else {
            app = getApp();
        }

        const storage = getStorage(app);

        // Elementos del DOM
        const toggleModeBtn = document.getElementById('toggle-mode');
        const body = document.body;
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('file-input');
        const selectFilesBtn = document.getElementById('select-files');
        const fileList = document.getElementById('file-list');
        const message = document.getElementById('message');

        let selectedFiles = [];

        // Alternar modo oscuro/claro
        const savedMode = localStorage.getItem('theme') || 'dark';
        if (savedMode === 'light') {
            body.classList.remove('dark-mode');
            toggleModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        }

        toggleModeBtn.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const isDark = body.classList.contains('dark-mode');
            toggleModeBtn.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });

        // Funciones de utilidad
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
            message.className = `message ${type} show`;
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
                <div class="file-item" data-id="${fileObj.id}">
                    <div class="file-info">
                        <i class="file-icon ${getFileIcon(fileObj.file)}"></i>
                        <div class="file-details">
                            <h4>${fileObj.file.name}</h4>
                            <p>${formatFileSize(fileObj.file.size)} • ${fileObj.file.type}</p>
                            ${fileObj.uploading ? `
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${fileObj.progress}%"></div>
                                </div>
                            ` : ''}
                            ${fileObj.uploaded && fileObj.url ? `
                                <p style="color: var(--success-color); margin-top: 0.5rem;">
                                    <i class="fas fa-check"></i> Subido exitosamente
                                </p>
                            ` : ''}
                        </div>
                    </div>
                    <div class="file-actions">
                        ${!fileObj.uploaded && !fileObj.uploading ? `
                            <button class="btn-small btn-upload" onclick="uploadFile('${fileObj.id}')">
                                <i class="fas fa-cloud-upload-alt"></i> Subir
                            </button>
                        ` : ''}
                        ${fileObj.uploaded && fileObj.url ? `
                            <button class="btn-small btn-upload" onclick="copyUrl('${fileObj.url}')">
                                <i class="fas fa-copy"></i> Copiar URL
                            </button>
                        ` : ''}
                        ${!fileObj.uploading ? `
                            <button class="btn-small btn-remove" onclick="removeFile('${fileObj.id}')">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        window.uploadFile = async function(fileId) {
            const fileObj = selectedFiles.find(f => f.id === fileId);
            if (!fileObj || fileObj.uploading || fileObj.uploaded) return;

            fileObj.uploading = true;
            renderFileList();

            try {
                // Crear referencia única para el archivo
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const fileName = `${timestamp}_${fileObj.file.name}`;
                const storageRef = ref(storage, `uploads/${fileName}`);

                // Subir archivo con seguimiento de progreso
                const uploadTask = uploadBytesResumable(storageRef, fileObj.file);

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        fileObj.progress = Math.round(progress);
                        renderFileList();
                    },
                    (error) => {
                        console.error('Error al subir:', error);
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
                            showMessage(`${fileObj.file.name} subido exitosamente!`);
                            renderFileList();
                        } catch (error) {
                            console.error('Error al obtener URL:', error);
                            showMessage(`Error al obtener URL de ${fileObj.file.name}`, 'error');
                        }
                    }
                );
            } catch (error) {
                console.error('Error al iniciar subida:', error);
                showMessage(`Error al iniciar subida de ${fileObj.file.name}`, 'error');
                fileObj.uploading = false;
                renderFileList();
            }
        };

        window.removeFile = function(fileId) {
            selectedFiles = selectedFiles.filter(f => f.id !== fileId);
            renderFileList();
        };

        window.copyUrl = async function(url) {
            try {
                await navigator.clipboard.writeText(url);
                showMessage('URL copiada al portapapeles!');
            } catch (error) {
                showMessage('Error al copiar URL', 'error');
            }
        };

        // Event listeners
        selectFilesBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => addFilesToList(e.target.files));

        // Drag and drop
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
        });

        uploadZone.addEventListener('click', (e) => {
            if (e.target === uploadZone || e.target.closest('i, h3, p')) {
                fileInput.click();
            }
        });