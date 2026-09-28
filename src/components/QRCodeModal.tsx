import React from 'react';
import { BookOpen, Download, Printer, QrCode, X } from 'lucide-react';
import { Book } from '../types';

interface QRCodeModalProps {
  book: Book;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ book, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');

  React.useEffect(() => {
    // Generate real QR code image containing strictly the Book ID
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(book.id, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      }).then(url => {
        setQrDataUrl(url);
      });
    });
  }, [book.id]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${book.id}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 2px dashed #333; padding: 24px; text-align: center; border-radius: 12px; max-width: 340px; }
            h2 { margin: 8px 0; font-size: 18px; }
            p { margin: 4px 0; color: #555; font-size: 14px; }
            .id-badge { font-family: monospace; font-size: 16px; font-weight: bold; background: #eee; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px; }
            img { width: 220px; height: 220px; }
          </style>
        </head>
        <body>
          <div class="card">
            <p style="font-weight: bold; color: #1e40af; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Smart Academic Locker System</p>
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : ''}
            <div class="id-badge">${book.id}</div>
            <h2>${book.bookName}</h2>
            <p>Subject: ${book.subject} | Class: ${book.classLevel}</p>
            <p>Type: ${book.type} | Weight: ${book.weightKg} kg</p>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div id="qr-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div id="qr-modal-container" className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2 text-slate-800">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-base">Book QR Code Card</h3>
          </div>
          <button
            id="close-qr-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-inner flex flex-col items-center mb-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR for ${book.id}`} className="w-56 h-56 rounded-lg bg-white p-2 border border-slate-100 shadow-xs" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}
            <span className="mt-3 font-mono font-bold text-sm tracking-wider bg-slate-200/80 text-slate-800 px-3 py-1 rounded-md">
              {book.id}
            </span>
          </div>

          <h4 className="font-bold text-slate-900 text-lg">{book.bookName}</h4>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs text-slate-600">
            <span className="bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full border border-blue-200">
              Subject: {book.subject}
            </span>
            <span className="bg-purple-50 text-purple-700 font-medium px-2.5 py-1 rounded-full border border-purple-200">
              Class {book.classLevel}
            </span>
            <span className="bg-emerald-50 text-emerald-700 font-medium px-2.5 py-1 rounded-full border border-emerald-200">
              {book.type} ({book.weightKg} kg)
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-4 max-w-xs leading-relaxed">
            Scan this QR code with the real camera scanner or demo tool to validate locker check-in.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <button
              id="print-qr-btn"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              Print QR Card
            </button>
            {qrDataUrl && (
              <a
                id="download-qr-btn"
                href={qrDataUrl}
                download={`QR_${book.id}.png`}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-medium text-sm hover:bg-indigo-100 transition-colors border border-indigo-200/80"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
