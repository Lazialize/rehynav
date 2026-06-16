import { useLocalSearchParams, useRouter } from 'rehynav';

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return (
    <div
      className="screen"
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <h1>Detail #{id}</h1>
      <button type="button" onClick={() => router.push(`/detail/${Number(id) + 1}`)}>
        Push next (#{Number(id) + 1})
      </button>
      <button type="button" onClick={() => router.back()}>
        Back
      </button>
    </div>
  );
}
