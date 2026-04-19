// =========================================
// MALA FAMA BREWING — Email Module (Nodemailer)
// =========================================

const nodemailer = require('nodemailer');

// SMTP transporter (configured from .env)
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Email] SMTP not configured — emails disabled. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  });

  return transporter;
}

const FROM = process.env.SMTP_FROM || 'Mala Fama Brewing <ventas@cervezamalafama.com>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ventas@cervezamalafama.com';

// ===== Helpers =====

function formatCurrency(amount) {
  return '$U ' + Number(amount).toLocaleString('es-UY', { minimumFractionDigits: 0 });
}

const STATUS_LABELS = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  enviado: 'Enviado',           // legacy, mantenemos por compatibilidad
  entregado_ues: 'Entregado a UES',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
};

function baseTemplate(title, bodyContent) {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f0f0f0;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;">
      <!-- Header -->
      <div style="background:#000;padding:24px 32px;text-align:center;">
        <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0;letter-spacing:2px;">MALA FAMA</h1>
        <p style="color:#999;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px;">Cerveceria Artesanal</p>
      </div>
      <!-- Title -->
      <div style="padding:32px 32px 0;">
        <h2 style="font-size:20px;font-weight:700;color:#000;margin:0 0 24px;text-transform:uppercase;">${title}</h2>
      </div>
      <!-- Body -->
      <div style="padding:0 32px 32px;">
        ${bodyContent}
      </div>
      <!-- Footer -->
      <div style="background:#f5f5f5;padding:20px 32px;text-align:center;border-top:1px solid #e0e0e0;">
        <p style="color:#999;font-size:11px;margin:0;">Mala Fama Brewing - Maldonado 1970, Montevideo</p>
        <p style="color:#999;font-size:11px;margin:4px 0 0;">@cerveceria_malafama</p>
      </div>
    </div>
  </body>
  </html>`;
}

// ===== Helpers compartidos para parsear items de pedido =====

/**
 * Parsea los items de un pedido de forma segura.
 * Maneja tanto string JSON como array directo. Si falla el parseo, retorna array vacío.
 */
function parseOrderItems(order) {
  try {
    return typeof order.items_json === 'string' ? JSON.parse(order.items_json) : (order.items || []);
  } catch (e) {
    console.error('[Email] Error al parsear items del pedido:', e.message);
    return [];
  }
}

/**
 * Genera el HTML de la tabla de items para emails de confirmación.
 */
function buildItemsTableHtml(items) {
  return items.map(i => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${i.name || 'Producto'}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${formatCurrency((i.priceUYU || 0) * (i.quantity || 1))}</td>
    </tr>
  `).join('');
}

// ===== Email Functions =====

async function sendOrderConfirmation(order) {
  const t = getTransporter();
  if (!t) return;

  const items = parseOrderItems(order);
  const itemsHtml = buildItemsTableHtml(items);

  const providerLabel = { card: 'Tarjeta', transfer: 'Transferencia', cash: 'Efectivo en local' };

  const body = `
    <p style="color:#333;font-size:15px;line-height:1.6;">Hola <strong>${order.customer_first_name || ''}</strong>, tu pedido fue recibido correctamente.</p>
    <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#666;"><strong>Pedido:</strong> ${order.order_id}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#666;"><strong>Metodo de pago:</strong> ${providerLabel[order.provider] || order.provider}</p>
      ${order.shipping_street ? `<p style="margin:0;font-size:13px;color:#666;"><strong>Envio a:</strong> ${order.shipping_street} ${order.shipping_apt || ''}, ${order.shipping_dept || ''}</p>` : ''}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
      <tr style="border-bottom:2px solid #000;">
        <th style="text-align:left;padding:8px 0;font-weight:700;">Producto</th>
        <th style="text-align:center;padding:8px 0;font-weight:700;">Cant.</th>
        <th style="text-align:right;padding:8px 0;font-weight:700;">Subtotal</th>
      </tr>
      ${itemsHtml}
    </table>
    <div style="text-align:right;margin-top:16px;padding-top:16px;border-top:2px solid #000;">
      <span style="font-size:20px;font-weight:900;color:#000;">${formatCurrency(order.total_uyu)}</span>
    </div>
    <p style="color:#999;font-size:12px;margin-top:24px;">Te mantendremos informado sobre el estado de tu pedido.</p>
  `;

  try {
    await t.sendMail({
      from: FROM,
      to: order.customer_email,
      subject: `Pedido ${order.order_id} - Mala Fama Brewing`,
      html: baseTemplate('Confirmacion de Pedido', body)
    });
    console.log('[Email] Order confirmation sent to', order.customer_email);
  } catch (err) {
    console.error('[Email] Failed to send order confirmation:', err.message);
  }
}

async function sendNewOrderNotification(order) {
  const t = getTransporter();
  if (!t) return;

  const items = parseOrderItems(order);
  const itemsList = items.map(i => `${i.name || 'Producto'} x${i.quantity}`).join(', ');

  const body = `
    <div style="background:#f0faf4;border-left:4px solid #38a169;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#000;">Nuevo pedido!</p>
    </div>
    <table style="width:100%;font-size:14px;color:#333;">
      <tr><td style="padding:6px 0;font-weight:700;">Pedido:</td><td>${order.order_id}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Cliente:</td><td>${order.customer_first_name || ''} ${order.customer_last_name || ''}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Email:</td><td>${order.customer_email}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Telefono:</td><td>${order.customer_phone || '-'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Items:</td><td>${itemsList}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Total:</td><td style="font-weight:900;font-size:18px;">${formatCurrency(order.total_uyu)}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Pago:</td><td>${order.provider}</td></tr>
      ${order.shipping_street ? `<tr><td style="padding:6px 0;font-weight:700;">Envio:</td><td>${order.shipping_street} ${order.shipping_apt || ''}, ${order.shipping_dept || ''}</td></tr>` : ''}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="#" style="display:inline-block;padding:12px 32px;background:#000;color:#fff;text-decoration:none;border-radius:50px;font-weight:700;font-size:14px;">VER EN ADMIN</a>
    </div>
  `;

  try {
    await t.sendMail({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `Nuevo Pedido ${order.order_id} - ${formatCurrency(order.total_uyu)}`,
      html: baseTemplate('Nuevo Pedido Recibido', body)
    });
    console.log('[Email] Admin notification sent');
  } catch (err) {
    console.error('[Email] Failed to send admin notification:', err.message);
  }
}

async function sendStatusUpdate(order, newStatus) {
  const t = getTransporter();
  if (!t || !order.customer_email) return;

  const trackingLine = order.tracking_info
    ? `<br><br><strong style="color:#000;">Código de seguimiento UES:</strong><br><span style="display:inline-block;margin-top:6px;padding:8px 14px;background:#fff;border:2px dashed #2b52b3;border-radius:6px;font-family:monospace;font-size:15px;font-weight:700;letter-spacing:0.08em;">${order.tracking_info}</span><br><br>Podés rastrear tu envío en <a href="https://www.ues.com.uy/" style="color:#2b52b3;font-weight:700;">ues.com.uy</a>.`
    : '';

  const statusMessages = {
    confirmado: 'Tu pago fue confirmado y estamos procesando tu pedido.',
    preparando: 'Estamos armando tu pedido en este momento. Te avisamos cuando esté en manos de UES para que puedas hacer el seguimiento.',
    enviado: `Tu pedido fue enviado! ${order.tracking_info ? 'Info de seguimiento: ' + order.tracking_info : 'Te avisaremos cuando llegue.'}`,
    entregado_ues: `Tu pedido ya está en manos de <strong>UES</strong> y en camino.${trackingLine}`,
    entregado: 'Tu pedido fue entregado. Esperamos que disfrutes tu cerveza!',
    cancelado: 'Tu pedido fue cancelado. Si tienes dudas, contactanos.'
  };

  const message = statusMessages[newStatus] || `El estado de tu pedido cambio a: ${newStatus}`;
  const statusColor = { confirmado: '#ecc94b', preparando: '#ed8936', enviado: '#805ad5', entregado_ues: '#2b52b3', entregado: '#38a169', cancelado: '#e53e3e' };

  const body = `
    <p style="color:#333;font-size:15px;line-height:1.6;">Hola <strong>${order.customer_first_name || ''}</strong>,</p>
    <div style="background:#f9f9f9;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <span style="display:inline-block;padding:6px 20px;background:${statusColor[newStatus] || '#999'};color:#fff;border-radius:50px;font-size:13px;font-weight:700;text-transform:uppercase;">${STATUS_LABELS[newStatus] || newStatus}</span>
      <p style="margin:16px 0 0;font-size:14px;color:#333;">${message}</p>
    </div>
    <p style="color:#999;font-size:13px;">Pedido: <strong>${order.order_id}</strong></p>
  `;

  try {
    await t.sendMail({
      from: FROM,
      to: order.customer_email,
      subject: `Pedido ${order.order_id} - ${STATUS_LABELS[newStatus] || newStatus}`,
      html: baseTemplate('Actualizacion de Pedido', body)
    });
    console.log('[Email] Status update sent to', order.customer_email);
  } catch (err) {
    console.error('[Email] Failed to send status update:', err.message);
  }
}

async function sendNewReservationNotification(booking) {
  const t = getTransporter();
  if (!t) return;

  const locationLabel = booking.location === 'punta-del-este' ? 'Punta del Este' : 'Montevideo';

  const body = `
    <div style="background:#f0faf4;border-left:4px solid #38a169;padding:16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#000;">Nueva reserva!</p>
    </div>
    <table style="width:100%;font-size:14px;color:#333;">
      <tr><td style="padding:6px 0;font-weight:700;">Nombre:</td><td>${booking.name}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Email:</td><td>${booking.email}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Fecha:</td><td>${booking.date}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Hora:</td><td>${booking.time}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Personas:</td><td>${booking.guests}</td></tr>
      <tr><td style="padding:6px 0;font-weight:700;">Local:</td><td style="font-weight:700;">${locationLabel}</td></tr>
    </table>
  `;

  try {
    await t.sendMail({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `Nueva Reserva - ${booking.name} (${locationLabel}, ${booking.date})`,
      html: baseTemplate('Nueva Reserva', body)
    });
    console.log('[Email] Reservation notification sent');
  } catch (err) {
    console.error('[Email] Failed to send reservation notification:', err.message);
  }
}

module.exports = {
  sendOrderConfirmation,
  sendNewOrderNotification,
  sendStatusUpdate,
  sendNewReservationNotification
};
