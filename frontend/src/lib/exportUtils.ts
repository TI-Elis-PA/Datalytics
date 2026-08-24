import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

/**
 * Export a given HTML element to PDF
 * @param elementId The ID of the container element
 * @param filename The desired filename
 */
export const exportToPDF = (elementId: string, filename: string = 'relatorio.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Elemento com ID ${elementId} não encontrado.`);
    alert('Erro ao gerar PDF: Elemento não encontrado.');
    return;
  }

  const opt = {
    margin:       0.5,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: '#090E1A' },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().set(opt).from(element).save();
};

/**
 * Export an array of objects to an Excel (.xlsx) file
 * @param data Array of objects (rows)
 * @param filename The desired filename
 * @param sheetName The name of the worksheet
 */
export const exportToExcel = <T extends Record<string, any>>(data: T[], filename: string = 'dados.xlsx', sheetName: string = 'Sheet1') => {
  if (!data || data.length === 0) {
    alert('Sem dados para exportar.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  XLSX.writeFile(workbook, filename);
};
