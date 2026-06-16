import { Link, useRouter } from 'rehynav';

export default function Home() {
  const router = useRouter();
  return (
    <div
      className="screen"
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <h1>rehynav playground</h1>
      <Link href="/detail/1">Link → /detail/1</Link>
      <button type="button" onClick={() => router.push('/detail/2')}>
        router.push('/detail/2')
      </button>
      <button
        type="button"
        onClick={() => router.push({ pathname: '/detail/[id]', params: { id: 42 } })}
      >
        push object href (id=42)
      </button>
      <Link href="/probes">Inspect navigation state →</Link>
    </div>
  );
}
