import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadMediaToR2 } from '@/lib/storage';
import PDFDocument from 'pdfkit';
import { requireAuth } from '@/lib/session';

const fetchImageBuffer = async (url: string): Promise<Buffer | null> => {
  try {
    // If it's a relative URL (local fallback), we could fetch from localhost or read from disk.
    // Assuming mostly external URLs (like R2, Unsplash, etc)
    const formattedUrl = url.startsWith('/') ? `http://127.0.0.1:3000${url}` : url;
    const res = await fetch(formattedUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error("Error fetching image for PDF:", url, e);
    return null;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export async function POST(request: Request) {
  const { brokerId, planId, error } = await requireAuth();
  if (error) return error;

  const { canGeneratePDF } = await import('@/lib/limits');
  if (!canGeneratePDF(planId!)) {
    return NextResponse.json({ success: false, error: "Upgrade to Premium required" }, { status: 403 });
  }

  try {
    const { propertyId } = await request.json();

    if (!propertyId) {
      return NextResponse.json({ success: false, error: 'propertyId is required' }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property || property.brokerId !== brokerId) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    // Prepare PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));

    const endPdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Logo / Header Bar
    doc.rect(0, 0, 595, 80).fill('#1a1a2e');
    doc.fontSize(28).fillColor('#ffffff').text('Brokerfield', 50, 25, { align: 'center' });
    
    // reset cursor Y position
    doc.y = 100;

    // Draw Title
    doc.fontSize(24).fillColor('#1a1a2e').text(property.title, { align: 'center' });
    doc.moveDown(0.5);

    // Location
    doc.fontSize(12).fillColor('#64748b').text(property.location || "Localização não informada", { align: 'center' });
    doc.moveDown(1.5);

    // Cover Image
    if (property.imageUrl) {
      const coverBuffer = await fetchImageBuffer(property.imageUrl);
      if (coverBuffer) {
        try {
          doc.image(coverBuffer, 50, doc.y, {
            fit: [495, 300],
            align: 'center',
            valign: 'center'
          });
          
          // Desenhar um contorno bonito ao redor da foto principal
          doc.rect(50, doc.y, 495, 300).strokeColor('#e2e8f0').lineWidth(2).stroke();
          
          doc.y += 320;
        } catch(e) {
          console.error("PDF: Error drawing cover image", e);
        }
      }
    } else {
      doc.y += 30;
    }
    
    // Details Box
    const detailsStartY = doc.y;
    doc.rect(50, detailsStartY, 495, 120).fillAndStroke('#f8fafc', '#cbd5e1');
    
    doc.fontSize(16).fillColor('#1e293b').text('Detalhes do Imóvel', 65, detailsStartY + 15);
    
    doc.fontSize(18).fillColor('#10b981').text(`${formatCurrency(property.price)}`, 65, detailsStartY + 45);
    
    doc.fontSize(12).fillColor('#475569');
    doc.text(`Quartos: ${property.bedrooms}`, 65, detailsStartY + 75);
    doc.text(`Área: ${property.area} m²`, 200, detailsStartY + 75);
    
    if (property.status === "AVAILABLE") doc.fillColor('#10b981').text("Disponível", 350, detailsStartY + 75);
    else if (property.status === "SOLD") doc.fillColor('#ef4444').text("Vendido", 350, detailsStartY + 75);

    doc.y = detailsStartY + 140;

    if (property.description) {
      doc.fontSize(12).fillColor('#334155').text(property.description, 50, doc.y, { align: 'justify', width: 495 });
      doc.moveDown(2);
    }

    // Gallery
    if (property.galleryUrls) {
      try {
        const gallery: string[] = JSON.parse(property.galleryUrls);
        if (gallery.length > 0) {
          doc.addPage();
          doc.rect(0, 0, 595, 80).fill('#1a1a2e');
          doc.fontSize(28).fillColor('#ffffff').text('Brokerfield', 50, 25, { align: 'center' });
          
          doc.y = 110;
          doc.fontSize(20).fillColor('#1e293b').text('Galeria de Fotos', 50, doc.y, { align: 'center' });
          doc.moveDown(2);

          let x = 50;
          let y = doc.y;
          const imageSize = 230;
          const gap = 35;

          for (let i = 0; i < gallery.length; i++) {
            const buf = await fetchImageBuffer(gallery[i]);
            if (buf) {
              try {
                if (y + imageSize > 750) {
                  doc.addPage();
                  doc.rect(0, 0, 595, 80).fill('#1a1a2e');
                  doc.fontSize(28).fillColor('#ffffff').text('Brokerfield', 50, 25, { align: 'center' });
                  x = 50;
                  y = 110;
                }
                
                doc.image(buf, x, y, { fit: [imageSize, imageSize] });
                doc.rect(x, y, imageSize, imageSize).strokeColor('#e2e8f0').lineWidth(1).stroke();
                
                if (x === 50) {
                  x += imageSize + gap;
                } else {
                  x = 50;
                  y += imageSize + gap;
                }
              } catch(e) {
                console.error("PDF: Error drawing gallery image", e);
              }
            }
          }
        }
      } catch (e) {
        console.error("PDF: Error parsing gallery URLs", e);
      }
    }

    // Video Link
    if (property.videoUrl) {
      doc.moveDown(2);
      doc.fontSize(14).fillColor('#3b82f6').text('► Assista ao Tour Virtual do Imóvel', 50, doc.y, { link: property.videoUrl, underline: true, align: 'center' });
    }

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.rect(0, 800, 595, 42).fill('#f1f5f9');
      doc.fontSize(10).fillColor('#64748b').text(`Apresentação gerada automaticamente pela Plataforma Brokerfield - Página ${i + 1} de ${pages.count}`, 0, 815, { align: 'center' });
    }

    // Finalize
    doc.end();

    const pdfBuffer = await endPdfPromise;
    const base64Pdf = pdfBuffer.toString('base64');
    
    // Upload to R2
    const safeTitle = property.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `pdf/Apresentacao_${safeTitle}_${Date.now()}.pdf`;
    const publicUrl = await uploadMediaToR2(base64Pdf, fileName, 'application/pdf', `${brokerId}/properties/pdfs`);

    if (!publicUrl) {
      return NextResponse.json({ success: false, error: 'Failed to upload PDF' }, { status: 500 });
    }

    return NextResponse.json({ success: true, pdfUrl: publicUrl });

  } catch (error: any) {
    console.error("[API/PROPERTIES/GENERATE-PDF] Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error', stack: error.stack }, { status: 500 });
  }
}
