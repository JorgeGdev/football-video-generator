let eventSource = null;
let currentSessionId = null;

// Conectar a logs en tiempo real
function conectarLogs() {
  eventSource = new EventSource("/api/logs");

  eventSource.onmessage = function (event) {
    const data = JSON.parse(event.data);
    const logOutput = document.getElementById("logOutput");
    logOutput.textContent += data.log + "\n";
    logOutput.scrollTop = logOutput.scrollHeight;
  };

  eventSource.onerror = function () {
    console.log("Error en conexión SSE, reintentando...");
  };
}

function updateStatus(elementId, status, text) {
  const element = document.getElementById(elementId);
  element.className = `status ${status}`;
  element.textContent = text;
}

function mostrarAprobacion(sessionId) {
  currentSessionId = sessionId;

  // Mostrar botones de aprobación
  document.getElementById("approvalButtons").classList.add("show");
  document.getElementById("sessionInfo").style.display = "block";
  document.getElementById("currentSessionId").textContent = sessionId;

  // Cambiar botón principal (EXACTO como Telegram)
  const generateBtn = document.getElementById("generateBtn");
  generateBtn.textContent = "⏳ Esperando Aprobación";
  generateBtn.disabled = true;

  // Deshabilitar controles como en Telegram
  document.getElementById("imagenSelect").disabled = true;
  document.getElementById("consultaInput").disabled = true;
}

function ocultarAprobacion() {
  currentSessionId = null;

  // Ocultar botones de aprobación
  document.getElementById("approvalButtons").classList.remove("show");
  document.getElementById("sessionInfo").style.display = "none";

  // Restaurar botón principal (EXACTO como Telegram)
  const generateBtn = document.getElementById("generateBtn");
  generateBtn.textContent = "🎬 Generar Script";
  generateBtn.disabled = false;

  // Reactivar controles
  document.getElementById("imagenSelect").disabled = false;
  document.getElementById("consultaInput").disabled = false;
}

async function aprobarScript() {
  if (!currentSessionId) return;

  // Deshabilitar botones inmediatamente
  document.getElementById("approveBtn").disabled = true;
  document.getElementById("rejectBtn").disabled = true;
  document.getElementById("sessionStatus").textContent = "Procesando video...";

  try {
    const response = await fetch(`/api/video/approve/${currentSessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    const result = await response.json();

    if (result.success) {
      // Ocultar interfaz de aprobación después del éxito
      setTimeout(() => {
        ocultarAprobacion();
        document.getElementById("consultaInput").value = "";
      }, 2000);
    } else {
      alert(result.message);
      // Reactivar botones si hay error
      document.getElementById("approveBtn").disabled = false;
      document.getElementById("rejectBtn").disabled = false;
    }
  } catch (error) {
    alert("Error aprobando script: " + error.message);
    // Reactivar botones si hay error
    document.getElementById("approveBtn").disabled = false;
    document.getElementById("rejectBtn").disabled = false;
  }
}

async function rechazarScript() {
  if (!currentSessionId) return;

  try {
    const response = await fetch(`/api/video/reject/${currentSessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    const result = await response.json();

    if (result.success) {
      ocultarAprobacion();
      document.getElementById("consultaInput").value = "";
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert("Error rechazando script: " + error.message);
  }
}

async function actualizarEstadisticas() {
  try {
    const response = await fetch("/api/stats", {
      credentials: "include"
    });
    const stats = await response.json();

    document.getElementById("vectorCount").textContent = stats.vectores;
    document.getElementById("videosCount").textContent = stats.videos;
    document.getElementById("successRate").textContent = stats.exito;

    // Actualizar estados
    if (stats.scraperActivo) {
      updateStatus("scraperStatus", "running", "Ejecutando");
      document.getElementById("scraperBtn").disabled = true;
    } else {
      updateStatus("scraperStatus", "idle", "Inactivo");
      document.getElementById("scraperBtn").disabled = false;
    }

    if (stats.botActivo) {
      updateStatus("botStatus", "running", "Bot Activo");
      document.getElementById("botBtn").disabled = true;
      document.getElementById("stopBotBtn").disabled = false;
    } else {
      updateStatus("botStatus", "idle", "Bot Inactivo");
      document.getElementById("botBtn").disabled = false;
      document.getElementById("stopBotBtn").disabled = true;
    }
  } catch (error) {
    console.error("Error actualizando estadísticas:", error);
  }
}

async function ejecutarScraper() {
  try {
    const response = await fetch("/api/scraper/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    const result = await response.json();

    if (result.success) {
      updateStatus("scraperStatus", "running", "Ejecutando");
      document.getElementById("scraperBtn").disabled = true;
      document.getElementById("scraperBtn").textContent = "🔄 Ejecutando...";
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert("Error ejecutando scraper: " + error.message);
  }
}

async function iniciarBot() {
  try {
    const response = await fetch("/api/bot/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    const result = await response.json();

    if (result.success) {
      updateStatus("botStatus", "running", "Bot Activo");
      document.getElementById("botBtn").disabled = true;
      document.getElementById("stopBotBtn").disabled = false;
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert("Error iniciando bot: " + error.message);
  }
}

async function detenerBot() {
  try {
    const response = await fetch("/api/bot/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    const result = await response.json();

    if (result.success) {
      updateStatus("botStatus", "idle", "Bot Inactivo");
      document.getElementById("botBtn").disabled = false;
      document.getElementById("stopBotBtn").disabled = true;
    } else {
      alert(result.message);
    }
  } catch (error) {
    alert("Error deteniendo bot: " + error.message);
  }
}

async function generarVideoManual() {
  const imagen = document.getElementById("imagenSelect").value;
  const consulta = document.getElementById("consultaInput").value;

  if (!consulta.trim()) {
    alert("Por favor ingresa una consulta");
    return;
  }

  // Cambiar botón a estado de carga
  const generateBtn = document.getElementById("generateBtn");
  generateBtn.textContent = "🤖 Generando Script...";
  generateBtn.disabled = true;

  try {
    const response = await fetch("/api/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ imagen, consulta }),
    });

    const result = await response.json();

    if (result.success && result.needsApproval) {
      // Mostrar interfaz de aprobación
      mostrarAprobacion(result.sessionId);
    } else if (result.success) {
      // Video completado directamente
      ocultarAprobacion();
      document.getElementById("consultaInput").value = "";
    } else {
      // Error
      alert(result.message);
      generateBtn.textContent = "🎬 Generar Script";
      generateBtn.disabled = false;
    }
  } catch (error) {
    alert("Error generando script: " + error.message);
    generateBtn.textContent = "🎬 Generar Script";
    generateBtn.disabled = false;
  }
}

async function limpiarLogs() {
  try {
    await fetch("/api/logs/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    document.getElementById("logOutput").textContent = "";
  } catch (error) {
    console.error("Error limpiando logs:", error);
  }
}

// ===== FUNCIÓN DE LOGOUT =====
async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/login.html";
  } catch (error) {
    // Si falla, redirigir de todas formas
    window.location.href = "/login.html";
  }
}

// Verificar autenticación al cargar
async function verificarAuth() {
  try {
    const response = await fetch("/api/auth/check", {
      credentials: "include",
    });

    if (!response.ok) {
      window.location.href = "/login.html";
      return;
    }

    const result = await response.json();
    if (!result.success) {
      window.location.href = "/login.html";
    }
  } catch (error) {
    window.location.href = "/login.html";
  }
}

// Inicializar cuando carga la página
window.onload = function () {
  verificarAuth(); // Verificar autenticación primero
  conectarLogs();
  actualizarEstadisticas();

  // Actualizar estadísticas cada 5 segundos
  setInterval(actualizarEstadisticas, 5000);
};

// Limpiar conexiones al cerrar
window.onbeforeunload = function () {
  if (eventSource) {
    eventSource.close();
  }
};
