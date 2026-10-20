import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Button from '../components/ui/Button';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });

// ═══════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════

const T = {
  en: {
    bookingReceipt: 'Booking Receipt',
    receiptNo: 'Receipt No',
    receiptDate: 'Receipt Date',
    travelDate: 'Travel Date',
    departureTime: 'Departure Time',
    tourDuration: 'Tour Duration',
    days: 'Days',
    nights: 'Nights',
    client: 'Client',
    route: 'Route',
    busNo: 'Bus No',
    routeStops: 'Route Stops',
    start: 'Start',
    end: 'End',
    vehicleAssignments: 'Vehicles & Staff',
    bus: 'Bus',
    driver: 'Driver',
    conductor: 'Conductor',
    phone: 'Phone',
    paymentDetails: 'Payment Details',
    totalBookingAmount: 'Total Booking Amount',
    advancePaid: 'Advance Paid',
    remainingDue: 'Remaining Due',
    notes: 'Notes',
    issued: 'ISSUED',
    paid: 'PAID',
    cancelled: 'CANCELLED',
    clientSignature: 'Client Signature',
    authorizedSignature: 'Authorized Signature',
  },
  ur: {
    bookingReceipt: 'بکنگ رسید',
    receiptNo: 'رسید نمبر',
    receiptDate: 'رسید کی تاریخ',
    travelDate: 'سفر کی تاریخ',
    departureTime: 'روانگی کا وقت',
    tourDuration: 'دورے کا دورانیہ',
    days: 'دن',
    nights: 'راتیں',
    client: 'گاہک',
    route: 'راستہ',
    busNo: 'بس نمبر',
    routeStops: 'راستے کے مقامات',
    start: 'آغاز',
    end: 'اختتام',
    vehicleAssignments: 'گاڑیاں اور عملہ',
    bus: 'بس',
    driver: 'ڈرائیور',
    conductor: 'کنڈکٹر',
    phone: 'فون',
    paymentDetails: 'ادائیگی کی تفصیلات',
    totalBookingAmount: 'کل بکنگ رقم',
    advancePaid: 'ادا شدہ پیشگی',
    remainingDue: 'باقی رقم',
    notes: 'نوٹس',
    issued: 'جاری',
    paid: 'ادا شدہ',
    cancelled: 'منسوخ',
    clientSignature: 'گاہک کے دستخط',
    authorizedSignature: 'مجاز دستخط',
  },
};

export default function ReceiptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState(null);
  const [settings, setSettings] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [tripVehicles, setTripVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [lang, setLang] = useState('en');
  const t = T[lang];
  const isUrdu = lang === 'ur';
  const dir = isUrdu ? 'rtl' : 'ltr';
  const urduFont = isUrdu
    ? { fontFamily: "'Noto Naskh Arabic', 'Jameel Noori Nastaleeq', serif" }
    : {};

  useEffect(() => {
    async function load() {
      try {
        const [r, s] = await Promise.all([
          api.get(`/receipts/${id}`),
          api.get('/settings'),
        ]);
        setReceipt(r.data);
        setSettings(s.data);

        if (r.data.trip_id) {
          try {
            const tripRes = await api.get(`/trips/${r.data.trip_id}/detail`);
            setWaypoints(tripRes.data.waypoints || []);
            setTripVehicles(tripRes.data.vehicles || []);
          } catch (err) {
            console.warn('Trip detail fetch failed, using fallback:', err);
            setWaypoints([]);
            setTripVehicles([]);
          }
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Receipt load nahi hui');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handlePrint() {
    window.print();
  }

  if (loading) return <p className="text-content-muted p-6">Loading...</p>;
  if (error) return <p className="text-danger p-6">{error}</p>;
  if (!receipt) return null;

  const due = Number(receipt.due_amount);
  const paid = Number(receipt.advance_amount);

  // ─── Multi-bus detection with fallback ───
  // Pehle tripVehicles se try karo, warna receipt ke comma-separated fields se.
  const splitList = (s) =>
    (s || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);

  const receiptBusNumbers = splitList(receipt.bus_number);
  const receiptDriverNames = splitList(receipt.driver_name);
  const receiptDriverPhones = splitList(receipt.driver_phone);
  const receiptConductorNames = splitList(receipt.conductor_name);
  const receiptConductorPhones = splitList(receipt.conductor_phone);

  // Decide: tripVehicles se ya fallback se
  const useTripVehicles = tripVehicles.length > 0;
  const displayVehicles = useTripVehicles
    ? tripVehicles
    : receiptBusNumbers.map((busNo, idx) => ({
        id: idx,
        order_no: idx + 1,
        vehicle: { reg_no: busNo, model: null },
        driver: {
          name: receiptDriverNames[idx] || receiptDriverNames[0] || '',
          phone: receiptDriverPhones[idx] || receiptDriverPhones[0] || '',
        },
        conductor: receiptConductorNames.length
          ? {
              name:
                receiptConductorNames[idx] || receiptConductorNames[0] || '',
              phone:
                receiptConductorPhones[idx] || receiptConductorPhones[0] || '',
            }
          : null,
      }));

  const isMultiBus = displayVehicles.length > 1;

  const statusText =
    receipt.status === 'paid'
      ? t.paid
      : receipt.status === 'cancelled'
        ? t.cancelled
        : t.issued;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          to="/receipts"
          className="text-sm text-content-muted hover:text-content"
        >
          ← Receipts
        </Link>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1 border border-surface-border rounded-lg p-0.5 bg-surface">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                lang === 'en'
                  ? 'bg-brand text-white'
                  : 'text-content-secondary hover:text-content'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('ur')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                lang === 'ur'
                  ? 'bg-brand text-white'
                  : 'text-content-secondary hover:text-content'
              }`}
              style={{ fontFamily: "'Noto Naskh Arabic', serif" }}
            >
              اردو
            </button>
          </div>

          <Button variant="secondary" onClick={() => navigate('/receipts')}>
            Close
          </Button>
          <Button onClick={handlePrint}>🖨️ Print / Save PDF</Button>
        </div>
      </div>

      {/* Receipt Paper */}
      <div
        id="receipt-paper"
        dir={dir}
        className="bg-white border border-surface-border rounded-xl p-8 print:border-0 print:rounded-none print:p-0"
        style={urduFont}
      >
        {/* Header */}
        <header
          className="text-center border-b-2 border-slate-800 pb-4 mb-6"
          style={{ direction: 'ltr' }}
        >
          <h1 className="text-3xl font-bold text-slate-900">
            {settings?.bus_service_name || 'Bus Service'}
          </h1>
          {settings?.address && (
            <p className="text-sm text-slate-600 mt-1">{settings.address}</p>
          )}
          <div className="text-sm text-slate-700 mt-2">
            {settings?.owner_name && (
              <p>
                <span className="font-semibold">{settings.owner_name}</span>
              </p>
            )}
            <p>
              {settings?.owner_phone_1}
              {settings?.owner_phone_2 && ` • ${settings.owner_phone_2}`}
            </p>
          </div>
        </header>

        {/* Title */}
        <div className="text-center mb-6">
          <h2
            className={`inline-block px-6 py-2 border-2 border-slate-800 text-lg font-bold text-slate-900 ${
              isUrdu ? 'text-xl' : 'uppercase tracking-wide'
            }`}
          >
            {t.bookingReceipt}
          </h2>
        </div>

        {/* Meta */}
        <div className="flex justify-between items-start mb-6 text-sm">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide">
              {t.receiptNo}
            </p>
            <p className="font-bold text-lg text-slate-900">
              {receipt.receipt_number}
            </p>
          </div>
          <div className={isUrdu ? 'text-left' : 'text-right'}>
            <p className="text-slate-500 text-xs tracking-wide">
              {t.receiptDate}
            </p>
            <p className="font-semibold text-slate-900">
              {receipt.receipt_date}
            </p>
            {receipt.travel_date && (
              <>
                <p className="text-slate-500 text-xs tracking-wide mt-2">
                  {t.travelDate}
                </p>
                <p className="font-semibold text-slate-900">
                  {receipt.travel_date}
                  {receipt.travel_day && (
                    <span className="text-slate-600 font-normal mx-1">
                      ({receipt.travel_day})
                    </span>
                  )}
                </p>
                {receipt.travel_time && (
                  <>
                    <p className="text-slate-500 text-xs tracking-wide mt-2">
                      {t.departureTime}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {receipt.travel_time}
                    </p>
                  </>
                )}
                {(receipt.tour_days || receipt.tour_nights) && (
                  <>
                    <p className="text-slate-500 text-xs tracking-wide mt-2">
                      {t.tourDuration}
                    </p>
                    <p className="font-semibold text-slate-900">
                      {receipt.tour_days || 0} {t.days}
                      {receipt.tour_nights !== null &&
                        receipt.tour_nights !== undefined &&
                        ` / ${receipt.tour_nights} ${t.nights}`}
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Client + Route */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <section>
            <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
              {t.client}
            </h2>
            <p className="font-semibold text-slate-900">{receipt.client_name}</p>
            <p
              className="text-sm text-slate-700 mt-1"
              style={{ direction: 'ltr' }}
            >
              {receipt.client_phone}
            </p>
            {receipt.client_phone_alt && (
              <p className="text-sm text-slate-700" style={{ direction: 'ltr' }}>
                {receipt.client_phone_alt}
              </p>
            )}
          </section>

          <section>
            <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
              {t.route}
            </h2>
            <p
              className="font-semibold text-slate-900"
              style={{ direction: 'ltr' }}
            >
              {receipt.route_from} → {receipt.route_to}
            </p>
          </section>
        </div>

        {/* Waypoints */}
        {waypoints.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
              {t.routeStops}
            </h2>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-12 text-slate-400 text-xs">{t.start}</span>
                <span
                  className="font-medium text-slate-900"
                  style={{ direction: 'ltr' }}
                >
                  {receipt.route_from}
                </span>
              </div>
              {waypoints.map((wp) => (
                <div key={wp.id} className="flex items-center gap-2 text-sm">
                  <span className="w-12 text-slate-400 text-xs">
                    {wp.order_no}.
                  </span>
                  <span className="text-slate-800" style={{ direction: 'ltr' }}>
                    {wp.stop_name}
                  </span>
                  {wp.arrival_time && (
                    <span
                      className="text-xs text-slate-500"
                      style={{ direction: 'ltr' }}
                    >
                      ({wp.arrival_time})
                    </span>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm">
                <span className="w-12 text-slate-400 text-xs">{t.end}</span>
                <span
                  className="font-medium text-slate-900"
                  style={{ direction: 'ltr' }}
                >
                  {receipt.route_to}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* VEHICLES & STAFF — Multi-bus table or single layout */}
        {/* ═══════════════════════════════════════════════ */}

        {isMultiBus ? (
          /* Multi-bus: table */
          <section className="mb-6">
            <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
              {t.vehicleAssignments}
            </h2>
            <table
              className="w-full text-sm border-collapse"
              style={{ direction: 'ltr' }}
            >
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-600 uppercase tracking-wide border border-slate-200 w-12">
                    #
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-600 uppercase tracking-wide border border-slate-200">
                    {t.busNo}
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-600 uppercase tracking-wide border border-slate-200">
                    {t.driver}
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-slate-600 uppercase tracking-wide border border-slate-200">
                    {t.conductor}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayVehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 px-3 border border-slate-200 text-slate-900 font-semibold">
                      #{v.order_no}
                    </td>
                    <td className="py-2 px-3 border border-slate-200 text-slate-900">
                      <span className="font-semibold">
                        {v.vehicle?.reg_no || '—'}
                      </span>
                      {v.vehicle?.model && (
                        <span className="block text-xs text-slate-500 font-normal">
                          {v.vehicle.model}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 border border-slate-200 text-slate-900">
                      <span className="font-medium">
                        {v.driver?.name || '—'}
                      </span>
                      {v.driver?.phone && (
                        <span className="block text-xs text-slate-600">
                          {v.driver.phone}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 border border-slate-200 text-slate-900">
                      {v.conductor && v.conductor.name ? (
                        <>
                          <span className="font-medium">
                            {v.conductor.name}
                          </span>
                          {v.conductor.phone && (
                            <span className="block text-xs text-slate-600">
                              {v.conductor.phone}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          /* Single bus: original layout */
          <div className="grid grid-cols-2 gap-6 mb-6">
            <section>
              <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
                {t.busNo}
              </h2>
              <p
                className="font-semibold text-slate-900"
                style={{ direction: 'ltr' }}
              >
                {receipt.bus_number}
              </p>
            </section>

            <section>
              <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
                {t.driver}
              </h2>
              <p
                className="font-semibold text-slate-900"
                style={{ direction: 'ltr' }}
              >
                {receipt.driver_name}
              </p>
              <p
                className="text-sm text-slate-700 mt-1"
                style={{ direction: 'ltr' }}
              >
                {receipt.driver_phone}
              </p>
              {receipt.driver_phone_alt && (
                <p
                  className="text-sm text-slate-700"
                  style={{ direction: 'ltr' }}
                >
                  {receipt.driver_phone_alt}
                </p>
              )}
            </section>

            {receipt.conductor_name && (
              <section className="col-span-2">
                <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
                  {t.conductor}
                </h2>
                <p
                  className="font-semibold text-slate-900"
                  style={{ direction: 'ltr' }}
                >
                  {receipt.conductor_name}
                </p>
                {receipt.conductor_phone && (
                  <p
                    className="text-sm text-slate-700 mt-1"
                    style={{ direction: 'ltr' }}
                  >
                    {receipt.conductor_phone}
                  </p>
                )}
                {receipt.conductor_phone_alt && (
                  <p
                    className="text-sm text-slate-700"
                    style={{ direction: 'ltr' }}
                  >
                    {receipt.conductor_phone_alt}
                  </p>
                )}
              </section>
            )}
          </div>
        )}

        {/* Payment Details */}
        <section className="mb-6">
          <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
            {t.paymentDetails}
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-700">
                  {t.totalBookingAmount}
                </td>
                <td className="py-2 text-right font-semibold text-slate-900">
                  PKR {fmt(receipt.total_amount)}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{t.advancePaid}</td>
                <td className="py-2 text-right font-semibold text-emerald-700">
                  PKR {fmt(paid)}
                </td>
              </tr>
              <tr>
                <td className="py-3 text-slate-900 font-bold text-base">
                  {t.remainingDue}
                </td>
                <td
                  className={`py-3 text-right font-bold text-lg ${
                    due > 0 ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  PKR {fmt(due)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Notes */}
        {receipt.notes && (
          <section className="mb-6">
            <h2 className="text-xs font-bold text-slate-500 tracking-wide mb-2 border-b border-slate-200 pb-1">
              {t.notes}
            </h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {receipt.notes}
            </p>
          </section>
        )}

        {/* Status badge */}
        <div className={`flex mb-6 ${isUrdu ? 'justify-start' : 'justify-end'}`}>
          <span
            className={`inline-block px-3 py-1 rounded-md text-xs font-bold tracking-wide border-2 ${
              receipt.status === 'paid'
                ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                : receipt.status === 'cancelled'
                  ? 'border-red-500 text-red-700 bg-red-50'
                  : 'border-blue-500 text-blue-700 bg-blue-50'
            }`}
          >
            {statusText}
          </span>
        </div>

        {/* Urdu Footer */}
        {settings?.receipt_footer_text && (
          <footer
            dir="rtl"
            className="border-t-2 border-slate-800 pt-4 mt-6 text-slate-800 text-base leading-loose text-right"
            style={{
              fontFamily:
                "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif",
            }}
          >
            {settings.receipt_footer_text}
          </footer>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 mt-10 pt-4">
          <div className="border-t border-slate-400 pt-1 text-center text-xs text-slate-600">
            {t.clientSignature}
          </div>
          <div className="border-t border-slate-400 pt-1 text-center text-xs text-slate-600">
            {t.authorizedSignature}
          </div>
        </div>
      </div>
    </div>
  );
}