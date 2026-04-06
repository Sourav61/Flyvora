import { jsPDF } from "jspdf";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});

const formatCurrency = (value) => currencyFormatter.format(value || 0);
const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : "--");
const formatTime = (value) => (value ? timeFormatter.format(new Date(value)) : "--");
const sanitizeFileName = (value = "ticket") => value.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "ticket";
const toUniqueList = (values = []) => Array.from(new Set(values.filter(Boolean)));

const normalizeBookingForPdf = (booking = {}) => {
  const seatCodes = toUniqueList(Array.isArray(booking.seatCodes) ? booking.seatCodes : [booking.seatCode]);
  const bookingReferences = toUniqueList(
    Array.isArray(booking.bookingReferences) ? booking.bookingReferences : [booking.bookingReference]
  );

  return {
    ...booking,
    seatCodes,
    seatLabel: seatCodes.join(", ") || "--",
    bookingReferences,
    bookingReferenceLabel: bookingReferences.join(", ") || booking.id || "Pending",
    travelersCount: Number(booking.travelersCount || seatCodes.length || 1),
  };
};

export const buildBookingPdfDoc = (inputBooking) => {
  const booking = normalizeBookingForPdf(inputBooking);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const flight = booking.flight || {};
  const traveler = booking.traveler || {};
  const fare = booking.fare || {};
  const departureTime = flight.departure_time || flight.departureTime || "";
  const arrivalTime = flight.arrival_time || flight.arrivalTime || "";
  const routeLabel = `${flight.airportFrom || flight.source || "--"} to ${flight.airportTo || flight.destination || "--"}`;
  const bookingReferenceLines = doc.splitTextToSize(`Booking Ref: ${booking.bookingReferenceLabel}`, 150);
  const seatLines = doc.splitTextToSize(`Seats: ${booking.seatLabel}`, 180);

  doc.setFillColor(6, 93, 124);
  doc.roundedRect(margin, 32, contentWidth, 118, 18, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Flyvora", margin + 24, 70);
  doc.setFontSize(11);
  doc.text("Digital itinerary", margin + 24, 92);
  doc.setFontSize(20);
  doc.text(routeLabel, margin + 24, 126);
  doc.setFontSize(11);
  doc.text(bookingReferenceLines, pageWidth - margin - 160, 68);
  doc.text(`Status: ${(booking.status || "confirmed").toUpperCase()}`, pageWidth - margin - 160, 96);
  doc.text(seatLines, pageWidth - margin - 160, 114);

  doc.setTextColor(26, 32, 44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Journey", margin, 194);
  doc.setDrawColor(220, 226, 235);
  doc.roundedRect(margin, 208, contentWidth, 120, 16, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Departure", margin + 24, 240);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(formatTime(departureTime), margin + 24, 272);
  doc.setFontSize(12);
  doc.text(flight.airportFrom || flight.source || "--", margin + 24, 296);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(departureTime), margin + 24, 314);

  doc.setFont("helvetica", "normal");
  doc.text("Arrival", pageWidth - margin - 150, 240);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(formatTime(arrivalTime), pageWidth - margin - 150, 272);
  doc.setFontSize(12);
  doc.text(flight.airportTo || flight.destination || "--", pageWidth - margin - 150, 296);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(arrivalTime), pageWidth - margin - 150, 314);

  doc.setDrawColor(6, 93, 124);
  doc.line(margin + 210, 260, pageWidth - margin - 210, 260);
  doc.setFontSize(10);
  doc.text(flight.flightNumber || "Flight", margin + 235, 246);
  doc.text(flight.airline || "Flyvora", margin + 235, 282);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Traveler", margin, 364);
  doc.roundedRect(margin, 378, contentWidth, 112, 16, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Name: ${traveler.name || "Traveler"}`, margin + 24, 408);
  doc.text(`Email: ${traveler.email || "--"}`, margin + 24, 432);
  doc.text(`Phone: ${traveler.phone || "--"}`, margin + 24, 456);
  doc.text(`Cabin: ${booking.cabinClass || "Economy"}`, pageWidth - margin - 220, 408);
  doc.text(`Travelers: ${booking.travelersCount}`, pageWidth - margin - 220, 432);
  doc.text(doc.splitTextToSize(`Seats: ${booking.seatLabel}`, 180), pageWidth - margin - 220, 456);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Fare Summary", margin, 526);
  doc.roundedRect(margin, 540, contentWidth, 120, 16, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  const lines = [
    ["Base fare", formatCurrency(fare.baseFare)],
    ["Taxes & fees", formatCurrency(fare.taxesAndFees)],
    ["Service fee", formatCurrency(fare.serviceFee)],
    ["Seat fee", fare.seatFee ? formatCurrency(fare.seatFee) : "Complimentary"],
  ];
  lines.forEach(([label, value], index) => {
    const y = 570 + index * 22;
    doc.text(label, margin + 24, y);
    doc.text(value, pageWidth - margin - 120, y);
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Total", margin + 24, 652);
  doc.text(formatCurrency(fare.totalAmount), pageWidth - margin - 120, 652);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 104, 119);
  const note = doc.splitTextToSize(
    "This itinerary was generated by Flyvora after successful booking confirmation. Please carry a valid government ID at the airport.",
    contentWidth
  );
  doc.text(note, margin, 706);

  return doc;
};

export const downloadBookingPdf = (booking) => {
  const normalizedBooking = normalizeBookingForPdf(booking);
  const doc = buildBookingPdfDoc(normalizedBooking);
  const fileName = sanitizeFileName(`flyvora-${normalizedBooking.bookingReferences[0] || normalizedBooking.id || "ticket"}`);
  doc.save(`${fileName}.pdf`);
};

export const viewBookingPdf = (booking) => {
  const doc = buildBookingPdfDoc(normalizeBookingForPdf(booking));
  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
};