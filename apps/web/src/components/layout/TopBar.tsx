import { Link } from 'react-router'

export function TopBar() {
  return (
    <header className="flex items-center gap-4 border-b px-4 py-3">
      <Link to="/">Home</Link>
      <Link to="/experiment">Experiment status</Link>
    </header>
  )
}
