import { getAuth, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';

const firebaseConfig = {
  apiKey: "AIzaSyDuF7p0X6N8IE19Bqt78LQAp805tMl84Ds",
  authDomain: "modular-app-16bd6.firebaseapp.com",
  projectId: "modular-app-16bd6",
  storageBucket: "modular-app-16bd6.firebasestorage.app",
  messagingSenderId: "1006327040835",
  appId: "1:1006327040835:web:b8b4f510da46514a3d3df6",
  measurementId: "G-GVKBWL9GT9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configurar persistencia de sesión
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log('Persistencia de autenticación configurada en sesión.');
  })
  .catch((error) => {
    console.error('Error al configurar persistencia:', error);
  });

function formatDateForTable(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
}

function showNotification(message, isError = false) {
    const notificationToast = document.getElementById('notification-toast');
    const successIcon = document.getElementById('success-icon');
    const successMessage = document.querySelector('.success-message');
    
    if (!notificationToast || !successIcon || !successMessage) {
        alert(isError ? `Error: ${message}` : `Éxito: ${message}`);
        return;
    }

    successIcon.className = `fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}`;
    successMessage.textContent = message;
    notificationToast.classList.remove('success', 'error');
    notificationToast.classList.add(isError ? 'error' : 'success');
    notificationToast.style.display = 'block';
    
    setTimeout(() => {
        notificationToast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            notificationToast.style.display = 'none';
            notificationToast.style.animation = 'slideInRight 0.3s ease';
        }, 300);
    }, 3000);
}

async function loadGuias(searchTerm = '') {
    const guiasList = document.getElementById('guias-list');
    const loadingScreen = document.getElementById('loadingScreen');
    if (!guiasList) {
        showNotification('Error: No se pudo cargar la lista de guías.', true);
        return;
    }

    if (loadingScreen) loadingScreen.style.display = 'flex';
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        let guiasQuery = query(
            collection(db, 'medtronic'),
            where('uid', '==', user.uid)
        );

        if (searchTerm) {
            // Firestore no soporta búsqueda de texto parcial en 'folio' directamente.
            // Filtraremos localmente tras obtener los documentos.
        }

        const guiasSnapshot = await getDocs(guiasQuery);
        guiasList.innerHTML = '';
        guiasSnapshot.forEach(doc => {
            const guia = doc.data();
            if (!searchTerm || guia.folio.toString().includes(searchTerm)) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="guia-titulo">${guia.folio || '-'}</span>
                    <div class="guia-info">
                        <span>Fecha: ${formatDateForTable(guia.fechaEmision)}</span>
                        <span>Razón Social: ${guia.razonSocial || '-'}</span>
                    </div>
                    <div class="guia-actions">
                        <i class="fas fa-edit" data-id="${doc.id}" title="Editar"></i>
                        <i class="fas fa-trash" data-id="${doc.id}" title="Eliminar"></i>
                    </div>
                `;
                guiasList.appendChild(li);

                li.querySelector('.guia-titulo').addEventListener('click', () => openEditModal(doc.id, guia));
                li.querySelector('.fa-edit').addEventListener('click', () => openEditModal(doc.id, guia));
                li.querySelector('.fa-trash').addEventListener('click', () => openDeleteModal(doc.id));
            }
        });

        if (guiasList.innerHTML === '') {
            guiasList.innerHTML = '<li>No se encontraron guías.</li>';
        }
    } catch (error) {
        console.error('Error al cargar guías:', error);
        showNotification(`Error al cargar guías: ${error.message}`, true);
    } finally {
        if (loadingScreen) loadingScreen.style.display = 'none';
    }
}

function renderDetalles(detallesList, detalles) {
    detallesList.innerHTML = '';
    detalles.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.nombre || '-'}</td>
            <td>${item.codigo || '-'}</td>
            <td>${Math.round(parseFloat(item.cantidad) || 0)}</td>
            <td>${item.descripcion || '-'}</td>
            <td>${item.fechaVencimiento || '-'}</td>
        `;
        detallesList.appendChild(tr);
    });
}

function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [210, 297]
    });
    const margin = 10;
    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxWidth = pageWidth - 2 * margin;

    const addText = (text, x, y, fontSize = 10, maxWidth = 190, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * fontSize * 0.3);
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Guía de Despacho Electrónica ${data.folio || 'Sin Folio'}`, margin, y + 10);
    y += 15;

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, maxWidth, 15, "F");
    y = addText("Información del Documento", margin + 5, y + 5, 10, maxWidth, true);
    y = addText(`Folio: ${data.folio || "-"}`, margin + 5, y + 3, 10);
    y = addText(`Fecha de Emisión: ${data.fechaEmision || "-"}`, margin + 5, y + 3, 10);
    y += 15;

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, maxWidth, 15, "F");
    y = addText("Emisor", margin + 5, y + 5, 10, maxWidth, true);
    y = addText(`Razón Social: ${data.razonSocial || "-"}`, margin + 5, y + 3, 10);
    y += 15;

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, maxWidth, 10, "F");
    y = addText("Detalles de los Ítems", margin + 5, y + 5, 10, maxWidth, true);

    const headers = ["Items", "Nombre", "Código", "Cantidad", "Lote", "Vencimiento"];
    const colWidths = [20, 50, 30, 20, 40, 30];
    const colSpacing = 1;
    let x = margin;
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, y, maxWidth, 7, "F");
    headers.forEach((header, i) => {
        doc.text(header, x + 2, y + 5, { maxWidth: colWidths[i] });
        x += colWidths[i] + colSpacing;
    });
    y += 7;

    (data.detalles || []).forEach((item, index) => {
        x = margin;
        const descLines = doc.splitTextToSize(item.nombre || "-", colWidths[1]);
        const rowHeight = Math.max(descLines.length * 4, 10);
        if (y + rowHeight > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
            x = margin;
            doc.setFillColor(200, 200, 200);
            doc.rect(margin, y, maxWidth, 7, "F");
            headers.forEach((header, i) => {
                doc.text(header, x + 2, y + 5, { maxWidth: colWidths[i] });
                x += colWidths[i] + colSpacing;
            });
            y += 7;
        }
        doc.setFillColor(index % 2 === 0 ? 255 : 240, 245, 255);
        doc.rect(margin, y, maxWidth, rowHeight, "F");
        doc.text((index + 1).toString(), x + 2, y + (rowHeight / 2), { maxWidth: colWidths[0], align: "center" });
        x += colWidths[0] + colSpacing;
        doc.text(descLines, x + 2, y + (rowHeight / 2), { maxWidth: colWidths[1] });
        x += colWidths[1] + colSpacing;
        doc.text(item.codigo || "-", x + 2, y + (rowHeight / 2), { maxWidth: colWidths[2], align: "center" });
        x += colWidths[2] + colSpacing;
        doc.text(Math.round(parseFloat(item.cantidad) || 0).toString(), x + 2, y + (rowHeight / 2), { maxWidth: colWidths[3], align: "center" });
        x += colWidths[3] + colSpacing;
        doc.text(item.descripcion || "-", x + 2, y + (rowHeight / 2), { maxWidth: colWidths[4], align: "center" });
        x += colWidths[4] + colSpacing;
        doc.text(item.fechaVencimiento || "-", x + 2, y + (rowHeight / 2), { maxWidth: colWidths[5], align: "center" });
        y += rowHeight;
    });

    return doc;
}

function openEditModal(id = null, guia = null) {
    const guiaModal = document.getElementById('guia-modal');
    if (!guiaModal) {
        showNotification('Error: No se pudo abrir el modal.', true);
        return;
    }

    guiaModal.style.display = 'flex';
    const guiaModalTitle = document.getElementById('guia-modal-title');
    const guiaFolioDisplay = document.getElementById('guia-folio-display');
    const guiaFechaEmisionDisplay = document.getElementById('guia-fecha-emision-display');
    const guiaRazonSocialDisplay = document.getElementById('guia-razon-social-display');
    const xmlFileInput = document.getElementById('xml-file-input');
    const detallesList = document.getElementById('detalles-list').querySelector('tbody');
    const saveGuiaBtn = document.getElementById('save-guia-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    if (guia) {
        guiaModalTitle.textContent = 'Editar Guía';
        guiaFolioDisplay.textContent = guia.folio || '-';
        guiaFechaEmisionDisplay.textContent = formatDateForTable(guia.fechaEmision);
        guiaRazonSocialDisplay.textContent = guia.razonSocial || '-';
        window.currentGuiaId = id;
        window.currentGuiaData = guia;
        saveGuiaBtn.disabled = false;
        downloadPdfBtn.disabled = false;
    } else {
        guiaModalTitle.textContent = 'Nueva Guía';
        guiaFolioDisplay.textContent = '-';
        guiaFechaEmisionDisplay.textContent = '-';
        guiaRazonSocialDisplay.textContent = '-';
        xmlFileInput.value = '';
        window.currentGuiaId = null;
        window.currentGuiaData = null;
        saveGuiaBtn.disabled = true;
        downloadPdfBtn.disabled = true;
    }

    renderDetalles(detallesList, guia?.detalles || []);
}

function openDeleteModal(id) {
    const deleteModal = document.getElementById('delete-modal');
    if (!deleteModal) {
        showNotification('Error: No se pudo abrir el modal de eliminación.', true);
        return;
    }
    window.currentGuiaId = id;
    deleteModal.style.display = 'flex';
}

async function saveGuia(guiaData) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!guiaData) {
        showNotification('No hay datos de guía para guardar.', true);
        return;
    }

    const { folio, fechaEmision, razonSocial, detalles } = guiaData;
    if (!folio || !fechaEmision || !razonSocial || !detalles || detalles.length === 0) {
        showNotification('Faltan datos requeridos en el XML.', true);
        return;
    }

    if (loadingScreen) loadingScreen.style.display = 'flex';
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        await user.getIdToken(true);

        let guiaId = window.currentGuiaId;
        if (guiaId) {
            const guiaRef = doc(db, 'medtronic', guiaId);
            const guiaDataToSave = {
                uid: user.uid,
                folio,
                fechaEmision,
                razonSocial,
                detalles,
                fechaModificacion: serverTimestamp()
            };
            await updateDoc(guiaRef, guiaDataToSave);
            return { success: true, message: `Guía ${folio} actualizada correctamente.` };
        } else {
            const guiaDataToSave = {
                uid: user.uid,
                folio,
                fechaEmision,
                razonSocial,
                detalles,
                fechaCreacion: serverTimestamp()
            };
            const guiaRef = await addDoc(collection(db, 'medtronic'), guiaDataToSave);
            return { success: true, message: `Guía ${folio} creada correctamente.` };
        }
    } catch (error) {
        console.error('Error detallado:', error);
        return { success: false, message: `Error al guardar guía ${folio}: ${error.message}` };
    } finally {
        if (loadingScreen) loadingScreen.style.display = 'none';
    }
}

async function saveMultipleGuias(guiaDataArray) {
    const results = await Promise.all(guiaDataArray.map(guiaData => saveGuia(guiaData)));
    const successes = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success);
    
    if (errors.length > 0) {
        const errorMessages = errors.map(r => r.message).join('; ');
        showNotification(`Se procesaron ${successes} guías correctamente. Errores: ${errorMessages}`, true);
    } else {
        showNotification(`Se procesaron ${successes} guías correctamente.`);
    }
    
    loadGuias();
    const guiaModal = document.getElementById('guia-modal');
    guiaModal.style.display = 'none';
    window.currentGuiaId = null;
    window.currentGuiaData = null;
    window.currentGuiaDataArray = null;
}

async function deleteGuia() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.style.display = 'flex';
    try {
        if (!window.currentGuiaId) throw new Error('ID de guía no válido');
        const user = auth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');

        await user.getIdToken(true);

        const guiaRef = doc(db, 'medtronic', window.currentGuiaId);
        const guiaDoc = await getDoc(guiaRef);
        if (!guiaDoc.exists()) {
            throw new Error('La guía no existe');
        }
        if (guiaDoc.data().uid !== user.uid) {
            throw new Error('No tienes permisos para eliminar esta guía');
        }

        await deleteDoc(guiaRef);
        showNotification('Guía eliminada correctamente.');
        loadGuias();
        const deleteModal = document.getElementById('delete-modal');
        deleteModal.style.display = 'none';
        window.currentGuiaId = null;
    } catch (error) {
        console.error('Error al eliminar guía:', error);
        showNotification(`Error al eliminar guía: ${error.message}`, true);
    } finally {
        if (loadingScreen) loadingScreen.style.display = 'none';
    }
}

function initializeModule() {
    const requiredElements = {
        'guias-list': 'Lista de guías',
        'crear-guia-btn': 'Botón para crear guía',
        'search-guia-input': 'Input de búsqueda',
        'guia-modal': 'Modal de edición',
        'guia-modal-title': 'Título del modal',
        'guia-folio-display': 'Display de folio',
        'guia-fecha-emision-display': 'Display de fecha de emisión',
        'guia-razon-social-display': 'Display de razón social',
        'xml-file-input': 'Input de archivo XML',
        'detalles-list': 'Lista de detalles',
        'save-guia-btn': 'Botón para guardar guía',
        'download-pdf-btn': 'Botón para visualizar PDF',
        'cancel-guia-btn': 'Botón para cancelar guía',
        'close-guia-btn': 'Botón para cerrar modal',
        'delete-modal': 'Modal de eliminación',
        'confirm-delete-btn': 'Botón para confirmar eliminación',
        'cancel-delete-btn': 'Botón para cancelar eliminación',
        'notification-toast': 'Notificación de éxito',
        'success-icon': 'Ícono de éxito'
    };

    for (const [id, description] of Object.entries(requiredElements)) {
        if (!document.getElementById(id)) {
            showNotification(`Error: No se encontró el elemento ${description}.`, true);
            return;
        }
    }

    if (!document.querySelector('.success-message')) {
        showNotification('Error: No se encontró el elemento Mensaje de éxito.', true);
        return;
    }

    const crearGuiaBtn = document.getElementById('crear-guia-btn');
    const searchGuiaInput = document.getElementById('search-guia-input');
    const saveGuiaBtn = document.getElementById('save-guia-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const cancelGuiaBtn = document.getElementById('cancel-guia-btn');
    const closeGuiaBtn = document.getElementById('close-guia-btn');
    const xmlFileInput = document.getElementById('xml-file-input');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const toggleThemeBtn = document.getElementById('toggle-theme-btn');

    crearGuiaBtn.addEventListener('click', () => openEditModal());
    searchGuiaInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        loadGuias(searchTerm);
    });
    saveGuiaBtn.addEventListener('click', async () => {
        if (!window.currentGuiaDataArray && !window.currentGuiaData) {
            showNotification('No hay datos de guía para guardar.', true);
            return;
        }
        if (window.currentGuiaDataArray) {
            await saveMultipleGuias(window.currentGuiaDataArray);
        } else {
            const result = await saveGuia(window.currentGuiaData);
            if (result.success) {
                showNotification(result.message);
                loadGuias();
                const guiaModal = document.getElementById('guia-modal');
                guiaModal.style.display = 'none';
                window.currentGuiaId = null;
                window.currentGuiaData = null;
            } else {
                showNotification(result.message, true);
            }
        }
    });
    downloadPdfBtn.addEventListener('click', () => {
        if (!window.currentGuiaData) {
            showNotification('No hay datos de guía para visualizar PDF.', true);
            return;
        }
        const pdfDoc = generatePDF(window.currentGuiaData);
        const pdfUrl = pdfDoc.output('bloburl');
        window.open(pdfUrl, '_blank');
    });
    cancelGuiaBtn.addEventListener('click', () => {
        const guiaModal = document.getElementById('guia-modal');
        guiaModal.style.display = 'none';
        window.currentGuiaId = null;
        window.currentGuiaData = null;
        window.currentGuiaDataArray = null;
    });
    closeGuiaBtn.addEventListener('click', () => {
        const guiaModal = document.getElementById('guia-modal');
        guiaModal.style.display = 'none';
        window.currentGuiaId = null;
        window.currentGuiaData = null;
        window.currentGuiaDataArray = null;
    });
    confirmDeleteBtn.addEventListener('click', deleteGuia);
    cancelDeleteBtn.addEventListener('click', () => {
        const deleteModal = document.getElementById('delete-modal');
        deleteModal.style.display = 'none';
        window.currentGuiaId = null;
    });
    if (toggleThemeBtn) {
        toggleThemeBtn.addEventListener('click', () => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme') || 'dark';
            html.setAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light');
        });
    }

    xmlFileInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const guiaDataArray = [];
        let hasErrors = false;

        const processFile = (file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const xmlString = e.target.result;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

                    if (!xmlDoc.querySelector("DTE")) {
                        showNotification(`El archivo ${file.name} no es un DTE válido.`, true);
                        hasErrors = true;
                        resolve(null);
                        return;
                    }

                    const encabezado = xmlDoc.querySelector("Encabezado");
                    if (!encabezado) {
                        showNotification(`El archivo ${file.name} no contiene un elemento <Encabezado>.`, true);
                        hasErrors = true;
                        resolve(null);
                        return;
                    }

                    const idDoc = encabezado.querySelector("IdDoc");
                    const emisor = encabezado.querySelector("Emisor");
                    const detalles = xmlDoc.querySelectorAll("Detalle");

                    if (!idDoc || !emisor) {
                        showNotification(`El archivo ${file.name} no contiene los elementos requeridos (IdDoc, Emisor).`, true);
                        hasErrors = true;
                        resolve(null);
                        return;
                    }

                    const getText = (node, tag) => {
                        if (!node) return null;
                        const element = node.querySelector(tag);
                        return element ? element.textContent.trim() : null;
                    };

                    const guiaData = {
                        folio: getText(idDoc, "Folio"),
                        fechaEmision: getText(idDoc, "FchEmis"),
                        razonSocial: getText(emisor, "RznSoc"),
                        detalles: Array.from(detalles).map(detalle => {
                            const cantidadText = getText(detalle, "QtyItem");
                            const cantidad = cantidadText ? parseFloat(cantidadText) : null;
                            return {
                                numeroLinea: getText(detalle, "NroLinDet") || "-",
                                codigo: getText(detalle.querySelector("CdgItem"), "VlrCodigo") || "-",
                                nombre: getText(detalle, "NmbItem") || "-",
                                descripcion: getText(detalle, "DscItem") || "-",
                                cantidad: isNaN(cantidad) ? 0 : cantidad,
                                fechaVencimiento: getText(detalle, "FchVencim") || "-"
                            };
                        })
                    };

                    if (
                        !guiaData.folio ||
                        !guiaData.fechaEmision ||
                        !guiaData.razonSocial ||
                        guiaData.detalles.length === 0 ||
                        guiaData.detalles.some(d => 
                            !d.nombre || 
                            d.cantidad === null || 
                            isNaN(d.cantidad)
                        )
                    ) {
                        showNotification(`El archivo ${file.name} no contiene datos válidos o completos.`, true);
                        hasErrors = true;
                        resolve(null);
                        return;
                    }

                    if (!/^\d{4}-\d{2}-\d{2}$/.test(guiaData.fechaEmision)) {
                        showNotification(`La fecha de emisión en el archivo ${file.name} no tiene el formato correcto (AAAA-MM-DD).`, true);
                        hasErrors = true;
                        resolve(null);
                        return;
                    }

                    resolve(guiaData);
                };
                reader.readAsText(file);
            });
        };

        for (const file of files) {
            const guiaData = await processFile(file);
            if (guiaData) {
                guiaDataArray.push(guiaData);
            }
        }

        if (guiaDataArray.length === 0) {
            showNotification('No se procesaron guías válidas.', true);
            return;
        }

        if (guiaDataArray.length === 1) {
            window.currentGuiaData = guiaDataArray[0];
            window.currentGuiaDataArray = null;
            document.getElementById('guia-folio-display').textContent = guiaDataArray[0].folio;
            document.getElementById('guia-fecha-emision-display').textContent = formatDateForTable(guiaDataArray[0].fechaEmision);
            document.getElementById('guia-razon-social-display').textContent = guiaDataArray[0].razonSocial;
            const detallesList = document.getElementById('detalles-list').querySelector('tbody');
            renderDetalles(detallesList, guiaDataArray[0].detalles);
            document.getElementById('save-guia-btn').disabled = false;
            document.getElementById('download-pdf-btn').disabled = false;
        } else {
            window.currentGuiaDataArray = guiaDataArray;
            window.currentGuiaData = null;
            document.getElementById('guia-folio-display').textContent = 'Múltiples guías';
            document.getElementById('guia-fecha-emision-display').textContent = '-';
            document.getElementById('guia-razon-social-display').textContent = '-';
            const detallesList = document.getElementById('detalles-list').querySelector('tbody');
            detallesList.innerHTML = '<tr><td colspan="6">Múltiples guías seleccionadas. Presione Guardar para procesar.</td></tr>';
            document.getElementById('save-guia-btn').disabled = false;
            document.getElementById('download-pdf-btn').disabled = true;
        }

        if (hasErrors) {
            showNotification('Algunos archivos no se procesaron correctamente. Revise los mensajes de error.', true);
        }
    });

    // Modificar onAuthStateChanged para evitar redirecciones prematuras
    auth.onAuthStateChanged(user => {
        if (user) {
            loadGuias();
        } else {
            // Mostrar pantalla de carga mientras se verifica el estado
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) loadingScreen.style.display = 'flex';
            // Retrasar la redirección para dar tiempo a la verificación
            setTimeout(() => {
                if (!auth.currentUser) {
                    showNotification('Error: Usuario no autenticado. Por favor, inicia sesión.', true);
                    window.location.href = 'index.html';
                }
            }, 2000); // Esperar 2 segundos para que Firebase resuelva el estado
        }
    });

    window.addEventListener('moduleCleanup', () => {
        const guiaModal = document.getElementById('guia-modal');
        const deleteModal = document.getElementById('delete-modal');
        const notificationToast = document.getElementById('notification-toast');
        if (guiaModal) guiaModal.style.display = 'none';
        if (deleteModal) deleteModal.style.display = 'none';
        if (notificationToast) notificationToast.style.display = 'none';
        window.currentGuiaId = null;
        window.currentGuiaData = null;
        window.currentGuiaDataArray = null;
    });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeModule, 1000); // Retrasar inicialización para esperar autenticación
} else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initializeModule, 1000));

}
