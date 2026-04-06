import { jsPDF } from 'jspdf';
import type { SaleContract, SaleInstallment, Client, Vehicle, SystemSettings } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReceiptData {
  installment: SaleInstallment;
  contract: SaleContract & { client?: Client; vehicle?: Vehicle };
  settings: SystemSettings;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PRIMARY: [number, number, number] = [37, 99, 235]; // Azul
const DARK: [number, number, number] = [15, 23, 42];    // Navy
const GRAY: [number, number, number] = [100, 116, 139]; // Slate
const LIGHT: [number, number, number] = [241, 245, 249]; // White-smoke

const loadLogo = async (url?: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url || '/logo.png';
    setTimeout(() => resolve(null), 2500);
  });
};

export const generateReceiptPDF = async ({ installment, contract, settings }: ReceiptData) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' }); // Formato A5 é ideal para recibos
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 15;
  const CW = W - M * 2;

  const logo = await loadLogo(settings.logo_url);

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 30, 'F');

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', M, 5, 18, 18);
    } catch (e) {
      console.warn('Logo error:', e);
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.company_name, M + 22, 12);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.company_cnpj} | ${settings.company_phone}`, M + 22, 17);
  doc.text(settings.company_address, M + 22, 21);

  // ── Receipt ID ──────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const receiptId = `RECIBO #${installment.id.slice(0, 8).toUpperCase()}`;
  const idW = doc.getTextWidth(receiptId);
  doc.text(receiptId, W - M - idW, 12);

  // ── Body ────────────────────────────────────────────────
  let y = 45;
  doc.setTextColor(...DARK);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECIBO DE PAGAMENTO', W / 2, y, { align: 'center' });
  
  y += 12;
  // Valor Box
  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, y, CW, 15, 2, 2, 'F');
  doc.setTextColor(...PRIMARY);
  doc.setFontSize(16);
  const amountStr = fmt(installment.paid_amount || installment.amount);
  doc.text(`VALOR RECEBIDO: ${amountStr}`, W / 2, y + 9.5, { align: 'center' });

  y += 25;
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const clientName = contract.client?.name || 'Cliente não identificado';
  const clientCpf = contract.client?.cpf_cnpj || '---';
  const vehicleInfo = `${contract.vehicle?.model} (${contract.vehicle?.plate || 'S/P'})`;
  const instInfo = `Parcela ${installment.installment_number}/${contract.installments}`;
  const payDate = installment.paid_at ? format(new Date(installment.paid_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '---';

  const text = `Recebemos de ${clientName}, inscrito(a) no CPF/CNPJ ${clientCpf}, a importância de ${amountStr}, referente ao pagamento da ${instInfo} do contrato de venda do veículo ${vehicleInfo}.`;
  
  const lines = doc.splitTextToSize(text, CW);
  doc.text(lines, M, y);

  y += (lines.length * 5) + 10;
  
  // ── Details ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhes do Recebimento:', M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`• Data do Pagamento: ${payDate}`, M + 5, y);
  y += 5;
  doc.text(`• Forma de Pagamento: Pix / Transferência`, M + 5, y);
  if (installment.notes) {
    y += 5;
    doc.text(`• Obs: ${installment.notes}`, M + 5, y);
  }

  // ── Signature ───────────────────────────────────────────
  y = H - 35;
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.5);
  doc.line(W/2 - 35, y, W/2 + 35, y);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.company_name, W / 2, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Documento emitido digitalmente', W / 2, y + 9, { align: 'center' });

  // ── Footer ──────────────────────────────────────────────
  doc.setFillColor(...LIGHT);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(`Gerado por Itabaiana Loc em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, W / 2, H - 4, { align: 'center' });

  const fileName = `recibo_${installment.installment_number}_${clientName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
  return fileName;
};
