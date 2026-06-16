import { Link } from 'rehynav';

export default function NotFound() {
  return (
    <div className="screen">
      <h1>404</h1>
      <p>This screen does not exist.</p>
      <Link href="/">Go home</Link>
    </div>
  );
}
