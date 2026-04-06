import { jsPDF } from 'jspdf';
import type { SaleContract } from '../types';
import type { CompanySettings } from './contractPDF';

type RGB = [number, number, number];

const PRIMARY:  RGB = [124, 58, 237];   // violet-600
const DARK2:    RGB = [29,  16, 64];    // deep violet-dark
const DARK:     RGB = [15,  23, 42];    // slate-900
const GRAY:     RGB = [100, 116, 139];  // slate-500
const LIGHT:    RGB = [245, 243, 255];  // violet-50
const WHITE:    RGB = [255, 255, 255];
const EMERALD:  RGB = [5,   150, 105];
const AMBER:    RGB = [217, 119, 6];

// ── util helpers ─────────────────────────────────────────────────────────
const safe = (s?: string | null) =>
  (s ?? '—').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const brl = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const loadLogo = async (url?: string): Promise<HTMLImageElement | null> =>
  new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url || '/logo.png';
    setTimeout(() => resolve(null), 2500);
  });

// ── drawing prims ─────────────────────────────────────────────────────────
const sectionHeader = (doc: jsPDF, title: string, y: number, M: number, CW: number, color: RGB = PRIMARY): number => {
  doc.setFillColor(...LIGHT);
  doc.roundedRect(M, y, CW, 9, 1, 1, 'F');
  doc.setFillColor(...color);
  doc.roundedRect(M, y, 4, 9, 1, 1, 'F');
  doc.rect(M + 2, y, 2, 9, 'F');
  doc.setTextColor(...color);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(title.toUpperCase(), M + 8, y + 6);
  return y + 14;
};

const fieldPair = (doc: jsPDF, label: string, value: string | null | undefined, x: number, y: number, w: number) => {
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(label.toUpperCase(), x, y);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(safe(value) || '—', x, y + 5);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  doc.line(x, y + 7, x + w, y + 7);
};

// ── main export ───────────────────────────────────────────────────────────
export const generateSaleContractPDF = async (
  sc: SaleContract,
  company: CompanySettings,
  clauses?: string[],
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W  = doc.internal.pageSize.getWidth();
  const H  = doc.internal.pageSize.getHeight();
  const M  = 18;
  const CW = W - M * 2;
  const c1 = M;
  const c2 = M + CW / 3;
  const c3 = M + (CW / 3) * 2;
  const cw = CW / 3 - 5;

  // ── Header ─────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 44, 'F');

  // violet accent sidebar
  doc.setFillColor(109, 40, 217); // violet-700
  doc.rect(0, 0, 6, 44, 'F');

  // Logo
  const logo = await loadLogo(company.logo);
  const textX = logo ? M + 26 : M;
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', M, 7, 21, 21);
    } catch { /* skip */ }
  }

  // Company name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(safe(company.name) || 'Itabaiana Loc', textX, 19);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const compSub: string[] = ['Contrato de Locacao com Intencao de Venda'];
  if (company.cnpj)  compSub.push(`CNPJ: ${company.cnpj}`);
  if (company.phone) compSub.push(company.phone);
  doc.text(compSub.join('  |  '), textX, 27);

  // Contract ID + date on right
  const contractId = `CONTRATO No ${sc.id.slice(0, 8).toUpperCase()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(contractId, W - M, 17, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, W - M, 24, { align: 'right' });
  doc.text(`${sc.installments}x de ${brl(sc.installment_value)}`, W - M, 30, { align: 'right' });

  // Accent bottom stripe
  doc.setFillColor(139, 92, 246); // violet-400
  doc.rect(0, 40, W, 4, 'F');

  let y = 53;

  // ── Main title ─────────────────────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CONTRATO DE LOCACAO COM INTENCAO DE VENDA', W / 2, y, { align: 'center' });
  y += 3;
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(M + 10, y, W - M - 10, y);
  y += 9;

  // ── 1. Dados da Locadora ───────────────────────────────────────────────
  y = sectionHeader(doc, '1. Dados da empresa (Locadora / Vendedora)', y, M, CW);
  fieldPair(doc, 'Razao Social / Nome', company.name, c1, y, cw);
  fieldPair(doc, 'CNPJ / CPF', company.cnpj, c2, y, cw);
  fieldPair(doc, 'Telefone', company.phone, c3, y, cw);
  y += 15;
  fieldPair(doc, 'Endereco Completo', company.address, c1, y, cw * 2 + 5);
  fieldPair(doc, 'E-mail', company.email, c3, y, cw);
  y += 18;

  // ── 2. Dados do Comprador ──────────────────────────────────────────────
  y = sectionHeader(doc, '2. Dados do Comprador (Locatario / Contratante)', y, M, CW);
  fieldPair(doc, 'Nome Completo', sc.client?.name, c1, y, cw * 2 + 5);
  fieldPair(doc, 'CPF / CNPJ', sc.client?.cpf_cnpj, c3, y, cw);
  y += 15;
  fieldPair(doc, 'RG', sc.client?.rg, c1, y, cw);
  fieldPair(doc, 'Telefone / WhatsApp', sc.client?.phone, c2, y, cw);
  fieldPair(doc, 'E-mail', sc.client?.email, c3, y, cw);
  y += 15;
  fieldPair(doc, 'Endereco do Comprador', sc.client?.address, c1, y, CW);
  y += 18;

  // ── 3. Dados do Veículo ────────────────────────────────────────────────
  y = sectionHeader(doc, '3. Dados do Veiculo', y, M, CW);
  fieldPair(doc, 'Modelo / Marca', sc.vehicle?.model, c1, y, cw);
  fieldPair(doc, 'Placa', sc.vehicle?.plate, c2, y, cw);
  fieldPair(doc, 'Ano de Fabricacao', String(sc.vehicle?.year ?? '—'), c3, y, cw);
  y += 15;
  fieldPair(doc, 'Cor', sc.vehicle?.color, c1, y, cw);
  fieldPair(doc, 'Categoria', sc.vehicle?.category, c2, y, cw);
  fieldPair(doc, 'Chassi / RENAVAM', '—', c3, y, cw);
  y += 18;

  // ── 4. Condições Financeiras ───────────────────────────────────────────
  if (y > 210) { doc.addPage(); y = 20; }

  y = sectionHeader(doc, '4. Condicoes Financeiras', y, M, CW);

  // Finance summary box
  doc.setFillColor(248, 245, 255);
  const fboxH = 48;
  doc.roundedRect(M, y, CW, fboxH, 3, 3, 'F');
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, CW, fboxH, 3, 3, 'S');

  // Top row
  fieldPair(doc, 'Valor Total de Venda', brl(sc.sale_price), c1 + 3, y + 8, cw - 3);
  fieldPair(doc, 'Entrada (Sinal)', brl(sc.down_payment), c2, y + 8, cw);
  const remaining = sc.sale_price - sc.down_payment;
  fieldPair(doc, 'Saldo a Parcelar', brl(remaining), c3, y + 8, cw);

  // Bottom row
  fieldPair(doc, 'Numero de Parcelas', `${sc.installments}x`, c1 + 3, y + 26, cw - 3);
  fieldPair(doc, 'Valor por Parcela', brl(sc.installment_value), c2, y + 26, cw);
  fieldPair(doc, 'Dia de Vencimento', `Todo dia ${sc.due_day}`, c3, y + 26, cw);

  // Highlight box for installment value
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(W - M - 44, y + 34, 44, 10, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('PARCELA MENSAL', W - M - 22, y + 39, { align: 'center' });
  doc.setFontSize(10);
  doc.text(brl(sc.installment_value), W - M - 22, y + 45, { align: 'center' });

  y += fboxH + 8;

  // Observações
  if (sc.notes?.trim()) {
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(M, y, CW, 18, 2, 2, 'F');
    doc.setDrawColor(...AMBER);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, 18, 2, 2, 'S');
    doc.setTextColor(120, 53, 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('OBSERVACOES:', M + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(safe(sc.notes), CW - 10);
    doc.text(noteLines, M + 4, y + 12);
    y += 24;
  }

  // ── 5. Tabela de Parcelas ──────────────────────────────────────────────
  if (sc.installment_records && sc.installment_records.length > 0) {
    if (y > H - 80) { doc.addPage(); y = 20; }

    y = sectionHeader(doc, '5. Tabela de Parcelas', y, M, CW);

    // Table header
    const cols = { num: M, due: M + 14, val: M + 52, status: M + 90, paid: M + 120, payAt: M + 158 };
    const rowH = 7;

    doc.setFillColor(...PRIMARY);
    doc.roundedRect(M, y, CW, rowH, 1, 1, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Nº', cols.num + 2, y + 4.8);
    doc.text('Vencimento', cols.due + 1, y + 4.8);
    doc.text('Valor', cols.val + 1, y + 4.8);
    doc.text('Situacao', cols.status + 1, y + 4.8);
    doc.text('Dt Pagto', cols.payAt + 1, y + 4.8);
    doc.text('Valor Pago', cols.paid + 1, y + 4.8);
    y += rowH;

    sc.installment_records.forEach((inst, idx) => {
      if (y > H - 35) { doc.addPage(); y = 20; }

      // Row bg
      doc.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 247 : 243, idx % 2 === 0 ? 255 : 255);
      doc.rect(M, y, CW, rowH, 'F');
      doc.setDrawColor(230, 225, 245);
      doc.setLineWidth(0.2);
      doc.rect(M, y, CW, rowH, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);

      // Status color
      const statusMap: Record<string, { label: string; color: RGB }> = {
        pending: { label: 'Pendente',  color: [217, 119, 6]  },
        paid:    { label: 'Pago',      color: [5,   150, 105] },
        overdue: { label: 'Atrasada',  color: [220, 38,  38]  },
      };
      const st = statusMap[inst.status] ?? statusMap.pending;

      const due = inst.due_date ? new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
      const paidAt = inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('pt-BR') : '—';
      const paidAmt = inst.status === 'paid' ? brl(Number(inst.paid_amount ?? inst.amount)) : '—';

      doc.setTextColor(...DARK);
      doc.text(String(inst.installment_number).padStart(2, '0'), cols.num + 2, y + 4.8);
      doc.text(due,  cols.due + 1,    y + 4.8);
      doc.text(brl(Number(inst.amount)), cols.val + 1, y + 4.8);
      doc.setTextColor(...st.color);
      doc.text(st.label, cols.status + 1, y + 4.8);
      doc.setTextColor(...DARK);
      doc.text(paidAt,  cols.payAt + 1,  y + 4.8);
      doc.text(paidAmt, cols.paid  + 1,  y + 4.8);

      y += rowH;
    });

    y += 8;

    // Summary row
    const paidTotal = sc.installment_records.filter(i => i.status === 'paid').reduce((a, i) => a + (Number(i.paid_amount ?? i.amount) || 0), 0);
    const pendTotal = sc.installment_records.filter(i => i.status !== 'paid').reduce((a, i) => a + (Number(i.amount) || 0), 0);

    doc.setFillColor(245, 243, 255);
    doc.roundedRect(M, y, CW, 16, 2, 2, 'F');
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, 16, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...EMERALD);
    doc.text(`Total Pago: ${brl(paidTotal + sc.down_payment)}`, c1 + 5, y + 10);
    doc.setTextColor(...[217, 119, 6]);
    doc.text(`Saldo Restante: ${brl(pendTotal)}`, c2 + 5, y + 10);
    doc.setTextColor(...PRIMARY);
    doc.text(`Total do Contrato: ${brl(sc.sale_price)}`, c3 + 5, y + 10);
    y += 22;
  }

  // ── 6. Cláusulas ──────────────────────────────────────────────────────
  if (y > H - 80) { doc.addPage(); y = 20; }

  const defaultClauses = [
    'O COMPRADOR/ LOCATARIO declara ter inspecionado o veiculo e o recebeu em perfeito estado de conservacao, limpeza e funcionamento mecanico.',
    'O presente contrato estabelece a locacao do veiculo descrito com opcao de compra parcelada conforme valores acordados, sendo vedada a sublocacao ou cessao a terceiros sem anuencia escrita da LOCADORA.',
    'As parcelas devem ser pagas ate o dia acordado de cada mes. O atraso superior a 05 (cinco) dias uteis acarretara multa de 2% sobre o valor da parcela e juros de 1% ao mes, calculados pro rata die.',
    'Em caso de inadimplencia superior a 02 (duas) parcelas consecutivas, a LOCADORA podera rescindir o contrato e retomar a posse do veiculo independentemente de notificacao judicial, sem que isso implique em devolucao de valores pagos a titulo de locacao.',
    'O COMPRADOR assume total responsabilidade por multas de transito, sinistros, danos a terceiros e quaisquer passivos administrativos gerados durante o periodo de uso do veiculo.',
    'Manutencoes preventivas (troca de oleo, filtros, pneus) sao de responsabilidade do COMPRADOR. Defeitos mecanicos de origem deverao ser comunicados imediatamente a LOCADORA.',
    'A transferencia do veiculo para o nome do COMPRADOR somente ocorrera apos a quitacao integral de todas as parcelas e mediante comprovante de regularizacao fiscal e fisco estadual.',
    'O COMPRADOR autoriza a LOCADORA a consultar e registrar informacoes cadastrais em orgaos de protecao ao credito em caso de inadimplencia.',
    'Fica eleito o foro da comarca da sede da LOCADORA para dirimir quaisquer controversias oriundas deste instrumento, com renuncio expresso a qualquer outro.',
    'Este contrato e regido pelas disposicoes do Codigo Civil Brasileiro (Lei 10.406/2002) e pela legislacao aplicavel ao arrendamento mercantil e venda a prazo.',
  ];

  const clausesToUse = (clauses && clauses.length > 0) ? clauses : defaultClauses;
  const clauseNum = sc.notes?.trim() || (sc.installment_records && sc.installment_records.length > 0)
    ? '6' : '5';

  y = sectionHeader(doc, `${clauseNum}. Clausulas e Condicoes Gerais`, y, M, CW);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);

  clausesToUse.forEach((clause, idx) => {
    if (!clause.trim()) return;
    const text = `${idx + 1}. ${clause.replace(/\n/g, ' ')}`;
    const lines = doc.splitTextToSize(text, CW - 2);
    if (y + lines.length * 4.5 > H - 44) { doc.addPage(); y = 20; }
    doc.text(lines, M + 1, y);
    y += lines.length * 4.3 + 2.5;
  });

  y += 6;

  // ── Signatures ─────────────────────────────────────────────────────────
  if (y > H - 42) { doc.addPage(); y = 20; }

  // Declaration text
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(M, y, CW, 12, 2, 2, 'F');
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  const decl = `As partes acima identificadas declaram ter lido, entendido e concordado integralmente com os termos deste instrumento, assinando-o em 02 (duas) vias de igual teor e forma.`;
  const declLines = doc.splitTextToSize(decl, CW - 6);
  doc.text(declLines, M + 3, y + 5);
  y += 18;

  const sigW = 74;
  const sig1x = M + 4;
  const sig2x = W - M - sigW - 4;
  const sigY = y + 14;

  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.5);
  doc.line(sig1x, sigY, sig1x + sigW, sigY);
  doc.line(sig2x, sigY, sig2x + sigW, sigY);

  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(safe(company.name) || 'LOCADORA / VENDEDORA', sig1x + sigW / 2, sigY + 5, { align: 'center' });
  doc.text(safe(sc.client?.name) || 'COMPRADOR / LOCATARIO', sig2x + sigW / 2, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text('Local e Data: _____________________, ___/___/______', sig1x + sigW / 2, sigY + 11, { align: 'center' });
  doc.text('Local e Data: _____________________, ___/___/______', sig2x + sigW / 2, sigY + 11, { align: 'center' });

  // ── Footer (all pages) ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...LIGHT);
    doc.rect(0, H - 11, W, 11, 'F');
    doc.setFillColor(...PRIMARY);
    doc.rect(0, H - 11, 4, 11, 'F');
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(
      safe(`${company.name}  |  ${company.phone || ''}  |  ${company.email || ''}`) + `  |  Contrato de Locacao c/ Intencao de Venda`,
      W / 2, H - 4, { align: 'center' }
    );
    doc.text(`Pag. ${p}/${pageCount}`, W - M, H - 4, { align: 'right' });
  }

  const slug = (sc.client?.name ?? 'cliente').replace(/\s+/g, '_');
  doc.save(`contrato_venda_${sc.id.slice(0, 8)}_${slug}.pdf`);
};
