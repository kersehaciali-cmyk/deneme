import { AlertTriangle, Banknote, CheckCircle2, CircleDollarSign, Plus, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/domain'
import type { Payment } from '../types'

export function Payments() {
  const { payments, customers, updatePayment, role } = useApp()
  const [selected, setSelected] = useState<Payment | null>(null)
  const total = payments.reduce((sum, item) => sum + item.amount, 0)
  const paid = payments.reduce((sum, item) => sum + item.paid, 0)
  const visible = role === 'musteri' ? payments.filter((payment) => payment.customerId === 'mus-001') : payments

  const recordPayment = (amount: number) => {
    if (!selected) return
    const newPaid = Math.min(selected.amount, selected.paid + amount)
    updatePayment({ ...selected, paid: newPaid, status: newPaid >= selected.amount ? 'Ödendi' : 'Kısmi' })
    setSelected(null)
  }

  return <div className="page-stack">
    <section className="page-title-row"><div><span className="eyebrow">FİNANS TAKİBİ</span><h1>Ödemeler</h1><p>Tahsilatları, kalan bakiyeleri ve ödeme vadelerini takip edin.</p></div></section>
    <section className="metric-grid payment-metrics"><Metric icon={<CircleDollarSign />} label="Toplam satış" value={formatCurrency(role === 'musteri' ? visible[0]?.amount ?? 0 : total)} tone="teal" /><Metric icon={<CheckCircle2 />} label="Tahsil edilen" value={formatCurrency(role === 'musteri' ? visible[0]?.paid ?? 0 : paid)} tone="green" /><Metric icon={<WalletCards />} label="Kalan bakiye" value={formatCurrency(role === 'musteri' ? (visible[0]?.amount ?? 0) - (visible[0]?.paid ?? 0) : total - paid)} tone="orange" /><Metric icon={<AlertTriangle />} label="Vadesi geçen" value={formatCurrency(payments.filter((item) => item.status === 'Gecikti').reduce((sum, item) => sum + item.amount - item.paid, 0))} tone="berry" /></section>
    <section className="panel table-panel"><div className="data-table payment-table"><div className="table-row table-head"><span>Müşteri / açıklama</span><span>Toplam</span><span>Tahsil edilen</span><span>Kalan</span><span>Vade</span><span>Durum</span><span /></div>{visible.map((payment) => {
      const customer = customers.find((item) => item.id === payment.customerId)
      return <div className="table-row" key={payment.id}><span><strong>{customer?.name}</strong><small>{payment.description} · {payment.id}</small></span><span><strong>{formatCurrency(payment.amount)}</strong></span><span>{formatCurrency(payment.paid)}</span><span><strong>{formatCurrency(payment.amount - payment.paid)}</strong></span><span>{new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(payment.dueDate))}</span><span><em className={`status-pill status-${payment.status.toLocaleLowerCase('tr-TR')}`}>{payment.status}</em></span><span>{role !== 'musteri' && payment.paid < payment.amount && <button className="table-action" onClick={() => setSelected(payment)}><Plus size={15} /> Tahsilat</button>}</span></div>
    })}</div></section>
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} eyebrow="TAHSİLAT" title="Ödeme kaydet">
      {selected && <PaymentForm payment={selected} onSave={recordPayment} />}
    </Modal>
  </div>
}

function PaymentForm({ payment, onSave }: { payment: Payment; onSave: (value: number) => void }) {
  const [amount, setAmount] = useState(payment.amount - payment.paid)
  return <div className="modal-form"><div className="payment-callout"><Banknote /><div><span>Kalan bakiye</span><strong>{formatCurrency(payment.amount - payment.paid)}</strong></div></div><label className="field"><span>Tahsil edilen tutar</span><input type="number" min="1" max={payment.amount - payment.paid} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label><footer className="modal-footer"><button className="primary-button" onClick={() => onSave(amount)}>Ödemeyi kaydet</button></footer></div>
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}>{icon}</span><div><span>{label}</span><strong>{value}</strong></div></article>
}
