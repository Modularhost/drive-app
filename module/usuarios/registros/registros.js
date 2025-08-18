import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, updatePassword, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDmAf-vi7PhzzQkPZh89q9p3Mz4vGGPtd0",
  authDomain: "modular-app-387da.firebaseapp.com",
  projectId: "modular-app-387da",
  storageBucket: "modular-app-387da.firebasestorage.app",
  messagingSenderId: "271561966774",
  appId: "1:271561966774:web:e197c00e2abd67b4f0d217",
  measurementId: "G-7YT6MMR47X"
};

let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (error) {
  console.error('Error al inicializar Firebase:', error);
  throw error;
}

const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(error => {
  console.error('Error al configurar persistencia:', error);
});

const submenuData = {
  Migración: [
    { name: 'Base de implantes' },
    { name: 'Historial de pacientes' },
    { name: 'Base de Consignación' },
    { name: 'Pacientes de Consignación' },
    { name: 'Traspasar Consignación' }
  ],
  Implantes: [
    { name: 'Cargos Imp' },
    { name: 'Pacientes Imp' },
    { name: 'Cargos Cgn' },
    { name: 'Pacientes Cgn' },
    { name: 'Referencias' },
    { name: 'Paquetización' },
    { name: 'Mantenedor' },
    { name: 'Tránsito' },
    { name: 'Contenedores' },
    { name: 'Catálogo' },
    { name: 'Exportar' }
  ],
  Consignacion: [
    { name: 'Asignación' },
    { name: 'Ficha' },
    { name: 'Lotes' },
    { name: 'Guías' }
  ],
  Historico: [
    { name: 'Historicos' },
    { name: 'Diferencias' },
    { name: 'Provisión' },
    { name: 'Recap' }
  ],
  Laboratorio: [
    { name: 'Facturación' },
    { name: 'Detalles' }
  ],
  Prestaciones: [
    { name: 'Empresas' },
    { name: 'Médicos' },
    { name: 'Previsiones' },
    { name: 'Áreas Clínicas' },
    { name: 'CTS Proveedores' },
    { name: 'CTS Clínico' }
  ],
  Importacion: [
    { name: 'Reporte Pabellón' },
    { name: 'Órdenes de Compra' },
    { name: 'Medtronic' }
  ],
  Apuntes: [
    { name: 'Notas' },
    { name: 'Bloc' }
  ],
  Resumen: [
    { name: 'Visor' },
    { name: 'ImplanteView' },
    { name: 'Consigna' },
    { name: 'FactuView' }
  ],
  Usuarios: [
    { name: 'Registros' }
  ],
  Herramientas: [
    { name: 'Presupuesto' },
    { name: 'Lector' },
    { name: 'DTE' }
  ]
};

const registerForm = document.getElementById('register-form');
const roleSelect = document.getElementById('role');
const successModal = document.getElementById('success-modal');
const successMessage = successModal ? successModal.querySelector('.success-message') : null;
const successIcon = document.getElementById('success-icon');
const loadingModal = document.getElementById('loading-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');
const editForm = document.getElementById('edit-form');
const editModulesContainer = document.getElementById('edit-modulesContainer');
const editPermisosContainer = document.getElementById('edit-permisos-container');
const tableBody = document.querySelector('#registros-table tbody');
const headers = document.querySelectorAll('#registros-table th');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfo = document.getElementById('page-info');
const totalRecords = document.getElementById('total-records');
const permissionsSelectionModal = document.getElementById('permissions-selection-modal');
const permissionsSelectionContainer = document.getElementById('permissions-selection-container');
const confirmPermissionsBtn = document.getElementById('confirm-permissions-btn');
const cancelPermissionsBtn = document.getElementById('cancel-permissions-btn');
const filterIcons = document.querySelectorAll('.filter-icon');
const tableContainer = document.getElementById('table-container');
let selectedPermissions = [];
let filters = Array(10).fill('');
let currentPage = 1;
const rowsPerPage = 10;

function showModal(type, message) {
  if (!successModal || !successIcon || !successMessage) {
    console.warn('Elementos de modal no encontrados');
    alert(message);
    return;
  }
  successModal.className = `modal ${type}`;
  successMessage.textContent = message;
  successIcon.className = `fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
  successModal.style.display = 'flex';
  setTimeout(() => {
    successModal.style.display = 'none';
  }, 2000);
}

function hideModal(modal) {
  if (!modal) return;
  modal.style.display = 'none';
}

function toggleLoading(show) {
  if (loadingModal) {
    loadingModal.style.display = show ? 'flex' : 'none';
  }
}

function getAllPermissions() {
  const permissions = [];
  Object.keys(submenuData).forEach(module => {
    submenuData[module].forEach(sub => {
      permissions.push(`${module}:${sub.name}`);
    });
  });
  return permissions;
}

function populatePermissions(container, selectedPermissions = []) {
  if (!container) return;
  container.innerHTML = '<p>Seleccione los permisos:</p>';
  Object.keys(submenuData).forEach(module => {
    const moduleDiv = document.createElement('div');
    moduleDiv.classList.add('module-permisos');
    moduleDiv.innerHTML = `<h3>${module}</h3>`;
    submenuData[module].forEach(sub => {
      const label = document.createElement('label');
      const isChecked = selectedPermissions.includes(`${module}:${sub.name}`);
      label.innerHTML = `
        <input type="checkbox" name="permissions" value="${module}:${sub.name}" ${isChecked ? 'checked' : ''}>
        ${sub.name}
      `;
      moduleDiv.appendChild(label);
    });
    container.appendChild(moduleDiv);
  });
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return 'Sin fecha';
  const date = new Date(dateStr);
  if (isNaN(date)) return 'Fecha inválida';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day}-${month}-${year}`;
}

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function logAction(userId, action, details = {}) {
  try {
    const fullName = await getUserFullName(auth.currentUser);
    await addDoc(collection(db, `users/${userId}/logs`), {
      action,
      details: JSON.stringify(details),
      timestamp: serverTimestamp(),
      user: fullName,
      uid: auth.currentUser.uid
    });
  } catch (error) {
    console.error('Error al registrar log:', error);
  }
}

async function getUserFullName(user) {
  if (!user) throw new Error('No se encontró el usuario autenticado');
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('No se encontró el documento del usuario');
  return userSnap.data().fullName || 'Usuario Desconocido';
}

async function checkAdminAccess() {
  const user = auth.currentUser;
  if (!user) {
    showModal('error', 'No estás autenticado. Por favor, inicia sesión nuevamente.');
    return false;
  }
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists() || userDoc.data().role !== 'Administrador') {
    showModal('error', 'Acceso denegado. Solo los administradores pueden acceder a este módulo.');
    return false;
  }
  return true;
}

function validateRUT(rut) {
  rut = rut.replace(/[^0-9kK]/g, '');
  if (rut.length < 2) return false;
  const body = rut.slice(0, -1);
  const dv = rut.slice(-1).toUpperCase();
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const expectedDV = mod === 11 ? '0' : mod === 10 ? 'K' : mod.toString();
  return expectedDV === dv;
}

function validateForm(data, isEditing = false) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!data.adminPassword) {
    showModal('error', 'La contraseña del administrador es obligatoria.');
    return false;
  }
  if (!data.fullName || data.fullName.length < 3) {
    showModal('error', 'El nombre completo debe tener al menos 3 caracteres.');
    return false;
  }
  if (!validateRUT(data.rut)) {
    showModal('error', 'El RUT ingresado no es válido.');
    return false;
  }
  if (!data.gender) {
    showModal('error', 'Seleccione un género.');
    return false;
  }
  if (!data.birthDate) {
    showModal('error', 'Seleccione una fecha de nacimiento.');
    return false;
  }
  if (!emailRegex.test(data.email)) {
    showModal('error', 'El correo electrónico no es válido.');
    return false;
  }

  if (!data.username) {
    showModal('error', 'El nombre de usuario es obligatorio.');
    return false;
  }

  if (data.username.trim().length === 0) {
    showModal('error', 'El nombre de usuario no puede estar vacío.');
    return false;
  }

  if (!isEditing) {
    if (!data.password || data.password.length < 6) {
      showModal('error', 'La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    if (data.password !== data.confirmPassword) {
      showModal('error', 'Las contraseñas no coinciden.');
      return false;
    }
  } else if (data.password && data.password.length < 6) {
    showModal('error', 'La contraseña debe tener al menos 6 caracteres.');
    return false;
  }
  if (!data.role) {
    showModal('error', 'Seleccione un rol.');
    return false;
  }
  return true;
}

function clearForm() {
  const fields = [
    'adminPassword',
    'fullName',
    'rut',
    'gender',
    'birthDate',
    'email',
    'username',
    'password',
    'confirmPassword',
    'role'
  ];
  let missingFields = [];
  fields.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.value = '';
    } else {
      missingFields.push(id);
    }
  });
  if (missingFields.length > 0) {
    console.warn(`Elementos no encontrados en el DOM: ${missingFields.join(', ')}`);
  }
  selectedPermissions = [];
}

function updateFilterIcons() {
  filterIcons.forEach(icon => {
    const columnIndex = parseInt(icon.getAttribute('data-column'));
    if (filters[columnIndex] && filters[columnIndex].trim() !== '') {
      icon.classList.add('filter-active');
      icon.parentElement.classList.add('filter-active');
      icon.parentElement.title = `Filtro: ${filters[columnIndex]}`;
    } else {
      icon.classList.remove('filter-active');
      icon.parentElement.classList.remove('filter-active');
      icon.parentElement.title = '';
    }
  });
}

function applyFilters(users) {
  const visibleRows = users.filter(user => {
    const rowData = [
      user.id.slice(0, 8) + '...',
      '', 
      user.fullName || 'Sin nombre',
      user.rut || 'Sin RUT',
      user.email || 'Sin correo',
      user.gender || 'Sin género',
      '', 
      user.username || 'Sin usuario',
      user.role || 'Sin rol',
      formatDateForDisplay(user.birthDate)
    ];
    return rowData.every((cell, index) => {
      if (!filters[index] || index === 1 || index === 6) return true;
      return cell.toLowerCase().includes(filters[index].toLowerCase());
    });
  });

  totalRecords.textContent = `Total de registros: ${visibleRows.length}`;
  const totalPages = Math.ceil(visibleRows.length / rowsPerPage) || 1;
  currentPage = Math.min(currentPage, totalPages);

  tableBody.innerHTML = '';
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedUsers = visibleRows.slice(start, end);

  paginatedUsers.forEach(user => {
    const row = document.createElement('tr');
    const iconClass = user.gender === 'Hombre' ? 'fa-male' : user.gender === 'Mujer' ? 'fa-female' : 'fa-genderless';
    row.innerHTML = `
      <td>${user.id.slice(0, 8)}...</td>
      <td>
        <button class="edit-btn action-icon"><i class="fas fa-edit"></i></button>
        <button class="delete-btn action-icon"><i class="fas fa-trash"></i></button>
        <button class="view-permissions-btn action-icon"><i class="fas fa-eye"></i></button>
      </td>
      <td>${user.fullName || 'Sin nombre'}</td>
      <td>${user.rut || 'Sin RUT'}</td>
      <td>${user.email || 'Sin correo'}</td>
      <td>${user.gender || 'Sin género'}</td>
      <td><i class="fas ${iconClass}"></i></td>
      <td>${user.username || 'Sin usuario'}</td>
      <td>${user.role || 'Sin rol'}</td>
      <td>${formatDateForDisplay(user.birthDate)}</td>
    `;
    tableBody.appendChild(row);
    row.querySelector('.edit-btn').addEventListener('click', () => {
      const editModal = document.getElementById('edit-modal');
      if (!editModal) return;
      editForm.dataset.uid = user.id;
      document.getElementById('edit-fullName').value = user.fullName || '';
      document.getElementById('edit-rut').value = user.rut || '';
      document.getElementById('edit-gender').value = user.gender || 'Otro';
      document.getElementById('edit-birthDate').value = formatDateForInput(user.birthDate);
      document.getElementById('edit-email').value = user.email || '';
      document.getElementById('edit-username').value = user.username || '';
      document.getElementById('edit-password').value = '';
      document.getElementById('edit-adminPassword').value = '';
      document.getElementById('edit-role').value = user.role || 'Operador';
      editModulesContainer.style.display = user.role === 'Operador' ? 'block' : 'none';
      populatePermissions(editPermisosContainer, user.permissions || []);
      editModal.style.display = 'flex';
    });
    row.querySelector('.delete-btn').addEventListener('click', () => {
      const deleteModal = document.getElementById('delete-modal');
      if (!deleteModal) return;
      document.getElementById('delete-fullName').textContent = user.fullName || 'Sin nombre';
      document.getElementById('delete-rut').textContent = user.rut || 'Sin RUT';
      document.getElementById('delete-email').textContent = user.email || 'Sin correo';
      deleteModal.dataset.uid = user.id;
      deleteModal.dataset.username = user.username || '';
      deleteModal.style.display = 'flex';
    });
    row.querySelector('.view-permissions-btn').addEventListener('click', () => {
      const permissionsModal = document.getElementById('permissions-modal');
      const permissionsRole = document.getElementById('permissions-role');
      const permissionsList = document.getElementById('permissions-list');
      if (!permissionsModal || !permissionsRole || !permissionsList) return;
      permissionsRole.textContent = user.role;
      permissionsList.innerHTML = '';
      if (user.role === 'Administrador') {
        permissionsList.innerHTML = '<p>Acceso completo a todos los módulos.</p>';
      } else if (user.permissions && user.permissions.length) {
        const modules = {};
        user.permissions.forEach(perm => {
          const [module, name] = perm.split(':');
          if (!modules[module]) modules[module] = [];
          modules[module].push(name);
        });
        Object.keys(modules).forEach(module => {
          const moduleDiv = document.createElement('div');
          moduleDiv.className = 'permission-module';
          moduleDiv.innerHTML = `<h3>${module}</h3>`;
          const ul = document.createElement('ul');
          modules[module].forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            ul.appendChild(li);
          });
          moduleDiv.appendChild(ul);
          permissionsList.appendChild(moduleDiv);
        });
      } else {
        permissionsList.innerHTML = '<p>Sin permisos asignados.</p>';
      }
      permissionsModal.style.display = 'flex';
    });
  });

  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;

  updateFilterIcons();
}

function createFilterContainer(columnIndex, th, icon) {
  const container = document.createElement('div');
  container.className = 'filter-container';

  const clearButton = document.createElement('button');
  clearButton.className = 'clear-filter-button';
  clearButton.textContent = 'Borrar Filtro';
  clearButton.disabled = !filters[columnIndex]; 
  clearButton.addEventListener('click', () => {
    filters[columnIndex] = '';
    currentPage = 1;
    loadUsers();
    closeAllFilters();
  });
  container.appendChild(clearButton);

  const label = document.createElement('label');
  label.className = 'filter-label';
  label.textContent = 'Filtrar por:';
  container.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.value = filters[columnIndex];
  input.placeholder = `Filtrar ${th.textContent.trim()}...`;
  container.appendChild(input);

  const iconRect = icon.getBoundingClientRect();
  const tableRect = tableContainer.getBoundingClientRect();
  const thRect = th.getBoundingClientRect();
  const topPosition = iconRect.bottom - tableRect.top + tableContainer.scrollTop + 2;
  const leftPosition = iconRect.left - tableRect.left + tableContainer.scrollLeft;
  container.style.top = `${topPosition}px`;
  container.style.left = `${leftPosition}px`;
  container.style.width = `${Math.min(thRect.width - 12, 200)}px`;

  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      filters[columnIndex] = input.value.trim();
      currentPage = 1;
      loadUsers();
      updateFilterIcons();
      clearButton.disabled = !filters[columnIndex];
    }, 300);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      filters[columnIndex] = input.value.trim();
      currentPage = 1;
      loadUsers();
      closeAllFilters();
    } else if (e.key === 'Escape') {
      closeAllFilters();
    }
  });

  return container;
}

function closeAllFilters() {
  document.querySelectorAll('.filter-container').forEach(container => {
    container.remove();
  });
  updateFilterIcons();
}

async function loadUsers(page = 1, pageSize = 10) {
  if (!tableContainer || !tableBody || !prevBtn || !nextBtn || !pageInfo || !totalRecords) {
    showModal('error', 'Elementos de la tabla no encontrados.');
    return false;
  }
  toggleLoading(true);
  tableBody.innerHTML = '';
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      tableBody.innerHTML = '<tr><td colspan="10">Acceso denegado. Solo los administradores pueden ver los usuarios.</td></tr>';
      tableContainer.style.display = 'block';
      return false;
    }
    const usersSnapshot = await getDocs(collection(db, 'users'));
    if (usersSnapshot.empty) {
      tableBody.innerHTML = '<tr><td colspan="10">No hay usuarios registrados.</td></tr>';
      tableContainer.style.display = 'block';
      toggleLoading(false);
      return;
    }
    const users = [];
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      users.push({ id: doc.id, ...data });
    });
    applyFilters(users);
    tableContainer.style.display = 'block';

    const resizeHandles = document.querySelectorAll('.resize-handle');
    resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', function (e) {
        e.preventDefault();
        const th = this.parentElement;
        const startX = e.pageX;
        const startWidth = th.offsetWidth;

        function onMouseMove(e) {
          const newWidth = startWidth + (e.pageX - startX);
          if (newWidth > 100) {
            th.style.width = newWidth + 'px';
            th.style.minWidth = newWidth + 'px';
          }
        }

        function onMouseUp() {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });

    filterIcons.forEach(icon => {
      icon.removeEventListener('click', icon._clickHandler);
      icon._clickHandler = (e) => {
        e.stopPropagation();
        const columnIndex = parseInt(icon.getAttribute('data-column'));
        const th = icon.parentElement;

        closeAllFilters();

        const container = createFilterContainer(columnIndex, th, icon);
        tableContainer.appendChild(container);
        container.style.display = 'block';
        container.querySelector('input').focus();
      };
      icon.addEventListener('click', icon._clickHandler);
    });

    document.removeEventListener('click', document._clickHandler); 
    document._clickHandler = (e) => {
      if (!e.target.closest('.filter-container') && !e.target.classList.contains('filter-icon')) {
        closeAllFilters();
      }
    };
    document.addEventListener('click', document._clickHandler);

    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        loadUsers();
      }
    };

    nextBtn.onclick = () => {
      const totalPages = Math.ceil(users.length / pageSize) || 1;
      if (currentPage < totalPages) {
        currentPage++;
        loadUsers();
      }
    };
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    tableBody.innerHTML = `<tr><td colspan="10">Error al cargar usuarios: ${error.message}</td></tr>`;
    tableContainer.style.display = 'block';
  } finally {
    toggleLoading(false);
  }
}

async function init() {
  const container = document.querySelector('.registros-container');
  if (!container) {
    console.error('Contenedor .registros-container no encontrado');
    return;
  }

  try {
    const user = await new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        } else {
          setTimeout(() => {
            if (!auth.currentUser) {
              unsubscribe();
              resolve(null);
            } else {
              unsubscribe();
              resolve(auth.currentUser);
            }
          }, 1000);
        }
      }, (error) => {
        console.error('Error:', error);
        reject(error);
      });
    });

    if (!user) {
      console.error('No hay usuario autenticado');
      container.innerHTML = '<p>Error: No estás autenticado. Por favor, inicia sesión nuevamente.</p>';
      setTimeout(() => {
        window.location = 'main.html';
      }, 1000);
      return;
    }

    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      container.innerHTML = '<p>Acceso denegado. Solo los administradores pueden acceder a este módulo.</p>';
      return;
    }

    await loadUsers();

    if (!registerForm) {
      console.error('Formulario register-form no encontrado');
      return;
    }

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      toggleLoading(true);

      const usernameElement = document.getElementById('username');

      const data = {
        adminPassword: document.getElementById('adminPassword')?.value || '',
        fullName: document.getElementById('fullName')?.value.trim() || '',
        rut: document.getElementById('rut')?.value || '',
        gender: document.getElementById('gender')?.value || '',
        birthDate: document.getElementById('birthDate')?.value || '',
        email: document.getElementById('email')?.value.trim() || '',
        username: usernameElement?.value.trim() || '', 
        password: document.getElementById('password')?.value || '',
        confirmPassword: document.getElementById('confirmPassword')?.value || '',
        role: document.getElementById('role')?.value || ''
      };
      if (!validateForm(data, false)) {
        toggleLoading(false);
        return;
      }
      try {
        const adminEmail = auth.currentUser ? auth.currentUser.email : null;
        if (!adminEmail) {
          throw new Error('No se encontró el email del administrador autenticado.');
        }

        try {
          await signInWithEmailAndPassword(auth, adminEmail, data.adminPassword);
        } catch (authError) {
          console.error('Error al verificar la contraseña del administrador:', authError);
          showModal('error', 'Contraseña del administrador incorrecta.');
          toggleLoading(false);
          return;
        }

        const usernameRef = doc(db, 'usernames', data.username);
        const usernameSnap = await getDoc(usernameRef);
        if (usernameSnap.exists()) {
          showModal('error', 'El nombre de usuario ya está en uso.');
          toggleLoading(false);
          return;
        }

        if (data.role === 'Operador') {
          if (!permissionsSelectionModal || !permissionsSelectionContainer) {
            showModal('error', 'Error: Contenedor de permisos no encontrado.');
            toggleLoading(false);
            return;
          }
          selectedPermissions = [];
          populatePermissions(permissionsSelectionContainer, selectedPermissions);
          permissionsSelectionModal.style.display = 'flex';
          toggleLoading(false);

          confirmPermissionsBtn.onclick = async () => {
            selectedPermissions = Array.from(permissionsSelectionContainer.querySelectorAll('input[name="permissions"]:checked')).map(input => input.value);
            if (selectedPermissions.length === 0) {
              showModal('error', 'Debe seleccionar al menos un permiso para el rol Operador.');
              return;
            }
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
              const user = userCredential.user;
              await setDoc(doc(db, 'users', user.uid), {
                fullName: data.fullName,
                rut: data.rut,
                email: data.email,
                gender: data.gender,
                birthDate: data.birthDate,
                username: data.username,
                role: data.role,
                permissions: selectedPermissions,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              await setDoc(doc(db, 'usernames', data.username), { uid: user.uid });
              await logAction(user.uid, 'Usuario creado', { email: data.email, role: data.role, createdBy: auth.currentUser.uid });
              showModal('success', 'Usuario registrado con éxito.');
              clearForm();
              loadUsers();
              hideModal(permissionsSelectionModal);
            } catch (error) {
              console.error('Error al registrar usuario:', error);
              showModal('error', `Error al registrar usuario: ${error.message}`);
            } finally {
              toggleLoading(false);
            }
          };

          cancelPermissionsBtn.onclick = () => {
            hideModal(permissionsSelectionModal);
            toggleLoading(false);
          };
        } else {
          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const user = userCredential.user;
          await setDoc(doc(db, 'users', user.uid), {
            fullName: data.fullName,
            rut: data.rut,
            email: data.email,
            gender: data.gender,
            birthDate: data.birthDate,
            username: data.username,
            role: data.role,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          await setDoc(doc(db, 'usernames', data.username), { uid: user.uid });
          await logAction(user.uid, 'Usuario creado', { email: data.email, role: data.role, createdBy: auth.currentUser.uid });
          showModal('success', 'Usuario registrado con éxito.');
          clearForm();
          loadUsers();
          toggleLoading(false);
        }
      } catch (error) {
        console.error('Error al registrar usuario:', error);
        showModal('error', `Error al registrar usuario: ${error.message}`);
        toggleLoading(false);
      }
    });

    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        toggleLoading(true);
        const data = {
          adminPassword: document.getElementById('edit-adminPassword').value,
          fullName: document.getElementById('edit-fullName').value.trim(),
          rut: document.getElementById('edit-rut').value.trim(),
          gender: document.getElementById('edit-gender').value,
          birthDate: document.getElementById('edit-birthDate').value,
          email: document.getElementById('edit-email').value.trim().toLowerCase(),
          username: document.getElementById('edit-username').value.trim(),
          password: document.getElementById('edit-password').value,
          role: document.getElementById('edit-role').value
        };
        const uid = editForm.dataset.uid;
        if (!validateForm(data, true)) {
          toggleLoading(false);
          return;
        }
        try {
          const adminEmail = auth.currentUser ? auth.currentUser.email : null;
          if (!adminEmail) {
            throw new Error('No se encontró el email del administrador autenticado.');
          }

          try {
            await signInWithEmailAndPassword(auth, adminEmail, data.adminPassword);
          } catch (authError) {
            console.error('Error al verificar la contraseña del administrador:', authError);
            showModal('error', 'Contraseña del administrador incorrecta.');
            toggleLoading(false);
            return;
          }
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            showModal('error', 'Usuario no encontrado.');
            toggleLoading(false);
            return;
          }
          const oldData = userSnap.data();
          const usernameRef = doc(db, 'usernames', oldData.username);
          const newUsernameRef = doc(db, 'usernames', data.username);
          const newUsernameSnap = await getDoc(newUsernameRef);
          if (oldData.username !== data.username && newUsernameSnap.exists()) {
            showModal('error', 'El nombre de usuario ya está en uso.');
            toggleLoading(false);
            return;
          }

          const updateData = {
            fullName: data.fullName,
            rut: data.rut,
            gender: data.gender,
            birthDate: data.birthDate,
            email: data.email,
            username: data.username,
            role: data.role,
            updatedAt: serverTimestamp()
          };

          if (data.role === 'Operador') {
            const newPermissions = Array.from(editPermisosContainer.querySelectorAll('input[name="permissions"]:checked')).map(input => input.value);
            if (newPermissions.length === 0) {
              showModal('error', 'Debe seleccionar al menos un permiso para el rol Operador.');
              toggleLoading(false);
              return;
            }
            updateData.permissions = newPermissions;
          } else {
            updateData.permissions = [];
          }

          if (data.password) {
            const userToUpdate = await signInWithEmailAndPassword(auth, oldData.email, data.adminPassword);
            await updatePassword(userToUpdate.user, data.password);
            await logAction(uid, 'Contraseña actualizada', { email: data.email });
          }

          await updateDoc(userRef, updateData);
          if (oldData.username !== data.username) {
            await deleteDoc(usernameRef);
            await setDoc(newUsernameRef, { uid });
          }
          await logAction(uid, 'Usuario actualizado', { email: data.email, role: data.role, updatedBy: auth.currentUser.uid });
          showModal('success', 'Usuario actualizado con éxito.');
          hideModal(document.getElementById('edit-modal'));
          loadUsers();
        } catch (error) {
          console.error('Error al actualizar usuario:', error);
          showModal('error', `Error al actualizar usuario: ${error.message}`);
        } finally {
          toggleLoading(false);
        }
      });

      document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        hideModal(document.getElementById('edit-modal'));
      });
    }

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
      const deleteModal = document.getElementById('delete-modal');
      if (!deleteModal) return;
      const uid = deleteModal.dataset.uid;
      const username = deleteModal.dataset.username;
      toggleLoading(true);
      try {
        const userRef = doc(db, 'users', uid);
        const usernameRef = doc(db, 'usernames', username);
        await deleteDoc(userRef);
        await deleteDoc(usernameRef);
        await logAction(uid, 'Usuario eliminado', { username, deletedBy: auth.currentUser.uid });
        showModal('success', 'Usuario eliminado con éxito.');
        hideModal(deleteModal);
        loadUsers();
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        showModal('error', `Error al eliminar usuario: ${error.message}`);
      } finally {
        hideModal(deleteModal);
        toggleLoading(false);
      }
    });

    document.getElementById('cancel-delete-btn').addEventListener('click', () => {
      hideModal(document.getElementById('delete-modal'));
    });

    closeModalButtons.forEach(button => {
      button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        hideModal(modal);
      });
    });

    roleSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Operador') {
        if (!permissionsSelectionModal || !permissionsSelectionContainer) {
          showModal('error', 'Error: Contenedor de permisos no encontrado.');
          return;
        }
        selectedPermissions = [];
        populatePermissions(permissionsSelectionContainer, selectedPermissions);
        permissionsSelectionModal.style.display = 'flex';
      }
    });

    document.getElementById('edit-role').addEventListener('change', (e) => {
      editModulesContainer.style.display = e.target.value === 'Operador' ? 'block' : 'none';
    });
  } catch (error) {
    console.error('Error al inicializar:', error);
    container.innerHTML = `<p>Error al inicializar: ${error.message}</p>`;
  }
}

init();