import { jsPDF } from 'jspdf';
import type { Contract, Client, Vehicle } from '../types';

export interface CompanySettings {
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
}

export interface ContractExtras {
  hasAvaria: boolean;
  avariaNotes: string;
  extraCharge: number;
}

type RGB = [number, number, number];

const PRIMARY: RGB = [37, 99, 235];
const DARK: RGB = [15, 23, 42];
const GRAY: RGB = [100, 116, 139];
const LIGHT: RGB = [241, 245, 249];
const WHITE: RGB = [255, 255, 255];
const ACCENT: RGB = [16, 185, 129]; // emerald

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

const section = (
  doc: jsPDF,
  title: string,
  y: number,
  pageWidth: number,
  margin: number,
  contentWidth: number
): number => {
  doc.setFillColor(...LIGHT);
  doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin, y + 8);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(title.toUpperCase(), margin + 5, y + 5.5);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  return y + 13;
};

const field = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number
) => {
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(label.toUpperCase(), x, y);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(value || '—', x, y + 5);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(x, y + 7, x + w, y + 7);
};

export const generateContractPDF = async (
  contract: Contract & { client?: Client; vehicle?: Vehicle; metadata?: any },
  company: CompanySettings,
  clauses?: string[],
  extras?: ContractExtras
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const CW = W - M * 2;
  const c1 = M;
  const c2 = M + CW / 3;
  const c3 = M + (CW / 3) * 2;
  const cw = CW / 3 - 5;

  // ── Header bar ──────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 42, 'F');

  // Gradient accent stripe
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, 6, 42, 'F');

  const logo = await loadLogo(company.logo);
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', M, 7, 20, 20);
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text(company.name || 'NexusLoc', M + 24, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Sistema de Gestão de Locação de Veículos', M + 24, 27);
    } catch {
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(company.name || 'NexusLoc', M, 22);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Sistema de Gestão de Locação de Veículos', M, 30);
    }
  } else {
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(company.name || 'NexusLoc', M, 22);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Sistema de Gestão de Locação de Veículos', M, 30);
  }

  // Contract ID & date - right
  const contractIdStr = `CONTRATO Nº ${contract.id.slice(0, 8).toUpperCase()}`;
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const idW = doc.getTextWidth(contractIdStr);
  doc.text(contractIdStr, W - M - idW, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const dateStr = `Emitido em: ${new Date().toLocaleDateString('pt-BR')}`;
  const dW = doc.getTextWidth(dateStr);
  doc.text(dateStr, W - M - dW, 26);

  let y = 52;

  // ── Title ───────────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CONTRATO DE LOCAÇÃO DE VEÍCULO', W / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.7);
  doc.line(M + 20, y, W - M - 20, y);
  y += 9;

  // ── Locadora ────────────────────────────────────────────
  y = section(doc, '1. Dados da Locadora', y, W, M, CW);
  field(doc, 'Razão Social / Nome', company.name || 'NexusLoc', c1, y, cw);
  field(doc, 'CNPJ / CPF', company.cnpj || 'Não informado', c2, y, cw);
  field(doc, 'Telefone', company.phone || '—', c3, y, cw);
  y += 15;
  field(doc, 'Endereço Completo', company.address || '—', c1, y, cw * 2 + 5);
  field(doc, 'E-mail', company.email || '—', c3, y, cw);
  y += 18;

  // ── Locatário ───────────────────────────────────────────
  y = section(doc, '2. Dados do Locatário (Contratante)', y, W, M, CW);
  field(doc, 'Nome Completo', contract.client?.name || '—', c1, y, cw * 2 + 5);
  field(doc, 'CPF / CNPJ', contract.client?.cpf_cnpj || '—', c3, y, cw);
  y += 15;
  field(doc, 'RG', contract.client?.rg || '—', c1, y, cw);
  field(doc, 'Telefone / WhatsApp', contract.client?.phone || '—', c2, y, cw);
  field(doc, 'E-mail', contract.client?.email || '—', c3, y, cw);
  y += 15;
  field(doc, 'Endereço do Locatário', contract.client?.address || '—', c1, y, CW);
  y += 18;

  // ── Veículo ─────────────────────────────────────────────
  y = section(doc, '3. Dados do Veículo Locado', y, W, M, CW);
  field(doc, 'Modelo / Marca', contract.vehicle?.model || '—', c1, y, cw);
  field(doc, 'Placa', contract.vehicle?.plate || '—', c2, y, cw);
  field(doc, 'Ano de Fabricação', String(contract.vehicle?.year || '—'), c3, y, cw);
  y += 15;
  field(doc, 'Cor', contract.vehicle?.color || '—', c1, y, cw);
  field(doc, 'Categoria', contract.vehicle?.category || '—', c2, y, cw);
  field(doc, 'Valor Diária', `R$ ${Number(contract.vehicle?.daily_rate || 0).toFixed(2)}`, c3, y, cw);
  y += 18;

  // ── Período ─────────────────────────────────────────────
  y = section(doc, '4. Período de Locação', y, W, M, CW);
  const sDate = new Date(contract.start_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const eDate = new Date(contract.end_date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const diffDays = Math.max(1, Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / 86400000));

  field(doc, 'Data de Retirada', sDate, c1, y, cw * 2 + 5);
  field(doc, 'Total de Dias', `${diffDays} dia${diffDays > 1 ? 's' : ''}`, c3, y, cw);
  y += 15;
  field(doc, 'Data de Devolução', eDate, c1, y, CW);
  y += 18;

  // ── Valores ─────────────────────────────────────────────
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  const extraCharge = extras?.extraCharge || 0;
  const locValue = Number(contract.total_value);
  const finalTotal = locValue + extraCharge;
  const saldo = Math.max(0, finalTotal - Number(contract.deposit));

  y = section(doc, '5. Resumo Financeiro', y, W, M, CW);

  doc.setFillColor(248, 250, 252);
  const boxH = extras?.hasAvaria ? 44 : 34;
  doc.roundedRect(M, y, CW, boxH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, boxH, 2, 2, 'S');

  y += 6;
  field(doc, 'Valor da Locação', `R$ ${locValue.toFixed(2)}`, c1 + 3, y, cw - 3);
  field(doc, 'Valor Pago', `R$ ${Number(contract.deposit).toFixed(2)}`, c2, y, cw);
  field(doc, 'Forma de Pgto', contract.payment_method || 'Pix', c3, y, cw);
  y += 14;

  if (extras?.hasAvaria) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(c1 + 3, y - 3, cw * 2 + 2, 10, 1, 1, 'F');
    field(doc, 'Avaria / Dano Adicional', `R$ ${extraCharge.toFixed(2)}`, c1 + 6, y, cw * 2 - 4);
    y += 14;
  }

  // Total highlight box
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(c3 - 3, y - 6, cw + 3, 15, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('VALOR TOTAL FINAL', c3, y - 1);
  doc.setFontSize(13);
  doc.text(`R$ ${finalTotal.toFixed(2)}`, c3, y + 7);

  doc.setTextColor(...ACCENT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Saldo a Receber: R$ ${saldo.toFixed(2)}`, c1 + 3, y + 6);
  y += 18;

  // ── Avaria notes ────────────────────────────────────────
  if (extras?.hasAvaria && extras.avariaNotes.trim()) {
    y = section(doc, '6. Descrição das Avarias / Danos', y, W, M, CW);
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(M, y, CW, 20, 2, 2, 'F');
    doc.setTextColor(120, 53, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const avLines = doc.splitTextToSize(extras.avariaNotes, CW - 8);
    doc.text(avLines, M + 4, y + 6);
    y += 26;
  }

  // ── Cláusulas ───────────────────────────────────────────
  const clauseNum = extras?.hasAvaria ? 7 : 6;
  if (y < H - 70) {
    y = section(doc, `${clauseNum}. Cláusulas e Condições Gerais`, y, W, M, CW);
    const defaultClauses = [
      '1. O LOCATÁRIO declara ter recebido o veículo em perfeito estado de conservação, higiene e funcionamento.',
      '2. Qualquer dano, avaria ou sinistro durante o período de locação é de responsabilidade exclusiva do LOCATÁRIO.',
      '3. A devolução deve ocorrer na data, hora e local acordados, sob pena de cobrança de diárias adicionais e multa contratual.',
      '4. É expressamente vedada a sublocação, cessão ou empréstimo do veículo a terceiros sem autorização escrita da LOCADORA.',
      '5. O LOCATÁRIO se compromete a utilizar o veículo somente dentro do território nacional, salvo autorização prévia.',
      '6. Em caso de multas de trânsito ou infrações durante o período locado, o LOCATÁRIO será o responsável pelo pagamento.',
    ];
    
    const clausesToUse = (clauses && clauses.length > 0) ? clauses : defaultClauses;
    
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    
    let clauseIndex = 1;
    for (const c of clausesToUse) {
      if (!c.trim()) continue;
      const text = clauses === clausesToUse ? `${clauseIndex}. ${c}` : c;
      const lines = doc.splitTextToSize(text, CW - 2);
      
      // Basic page overflow check
      if (y + (lines.length * 5) > H - 40) {
        doc.addPage();
        y = 30;
      }
      
      doc.text(lines, M + 1, y);
      y += lines.length * 4.3 + 2;
      clauseIndex++;
    }
    y += 4;
  }

  // ── Assinaturas ─────────────────────────────────────────
  const sigY = Math.min(y + 6, H - 38);
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.5);
  const sigW = 72;
  const sig1x = M + 5;
  const sig2x = W - M - sigW - 5;
  doc.line(sig1x, sigY, sig1x + sigW, sigY);
  doc.line(sig2x, sigY, sig2x + sigW, sigY);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(company.name || 'LOCADORA', sig1x + sigW / 2, sigY + 5, { align: 'center' });
  doc.text(contract.client?.name || 'LOCATÁRIO', sig2x + sigW / 2, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Data: ___/___/______', sig1x + sigW / 2, sigY + 10, { align: 'center' });
  doc.text('Data: ___/___/______', sig2x + sigW / 2, sigY + 10, { align: 'center' });

  // ── Footer ──────────────────────────────────────────────
  doc.setFillColor(...LIGHT);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setFillColor(...PRIMARY);
  doc.rect(0, H - 12, 4, 12, 'F');
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const foot = `${company.name || 'NexusLoc'}  •  ${company.phone || ''}  •  ${company.email || ''}  •  ${company.website || ''}`;
  doc.text(foot, W / 2, H - 4, { align: 'center' });

  const clientSlug = contract.client?.name?.replace(/\s+/g, '_') || 'cliente';
  doc.save(`contrato_${contract.id.slice(0, 8)}_${clientSlug}.pdf`);
};
