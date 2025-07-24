const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

console.log('🔐 AUTH MANAGER INICIADO');

const USERS_FILE = path.join(__dirname, '..', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Cargar usuarios desde archivo
async function cargarUsuarios() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error cargando usuarios:', error.message);
    return {};
  }
}

// Guardar usuarios en archivo
async function guardarUsuarios(usuarios) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(usuarios, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error guardando usuarios:', error.message);
    return false;
  }
}

// Validar credenciales
async function validarCredenciales(username, password) {
  try {
    const usuarios = await cargarUsuarios();
    const usuario = usuarios[username];
    
    if (!usuario || !usuario.active) {
      return { success: false, message: 'Usuario no encontrado o inactivo' };
    }
    
    const passwordValida = await bcrypt.compare(password, usuario.password);
    
    if (!passwordValida) {
      return { success: false, message: 'Contraseña incorrecta' };
    }
    
    // Crear JWT token
    const token = jwt.sign(
      { 
        username: username,
        role: usuario.role,
        name: usuario.name
      },
      JWT_SECRET,
      { expiresIn: process.env.SESSION_DURATION || '24h' }
    );
    
    return {
      success: true,
      token: token,
      user: {
        username: username,
        role: usuario.role,
        name: usuario.name
      }
    };
    
  } catch (error) {
    console.error('❌ Error validando credenciales:', error.message);
    return { success: false, message: 'Error interno' };
  }
}

// Verificar JWT token
function verificarToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, message: 'Token inválido' };
  }
}

// Crear nuevo usuario (solo admin)
// Crear nuevo usuario (solo admin) - VERSIÓN CON EMAIL
async function crearUsuario(username, password, name, email, role = 'user') {
  try {
    const usuarios = await cargarUsuarios();
    
    if (usuarios[username]) {
      return { success: false, message: 'Usuario ya existe' };
    }
    
    // Validar email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Email inválido' };
    }
    
    // Verificar que el email no esté en uso
    const emailEnUso = Object.values(usuarios).some(user => user.email === email);
    if (emailEnUso) {
      return { success: false, message: 'Email ya está en uso' };
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    usuarios[username] = {
      password: hashedPassword,
      role: role,
      name: name,
      email: email, // NUEVO CAMPO
      created: new Date().toISOString().split('T')[0],
      active: true
    };
    
    const guardado = await guardarUsuarios(usuarios);
    
    if (guardado) {
      return { success: true, message: 'Usuario creado exitosamente' };
    } else {
      return { success: false, message: 'Error guardando usuario' };
    }
    
  } catch (error) {
    console.error('❌ Error creando usuario:', error.message);
    return { success: false, message: 'Error interno' };
  }
}

// Listar usuarios (solo admin)
// Listar usuarios (solo admin) - VERSIÓN CON EMAIL
async function listarUsuarios() {
  try {
    const usuarios = await cargarUsuarios();
    const lista = Object.keys(usuarios).map(username => ({
      username: username,
      name: usuarios[username].name,
      email: usuarios[username].email || 'Sin email', // NUEVO CAMPO
      role: usuarios[username].role,
      created: usuarios[username].created,
      active: usuarios[username].active
    }));
    
    return { success: true, users: lista };
  } catch (error) {
    return { success: false, message: 'Error cargando usuarios' };
  }
}

// Middleware de autenticación para Express
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
  
  const verification = verificarToken(token);
  
  if (!verification.success) {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
  
  req.user = verification.user;
  next();
}

// Middleware solo para admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Se requieren permisos de administrador' });
  }
  next();
}

module.exports = {
  validarCredenciales,
  verificarToken,
  crearUsuario,
  listarUsuarios,
  requireAuth,
  requireAdmin
};