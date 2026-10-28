import { Link, useLocation } from 'react-router-dom'

/**
 * "Влезте", returning to this page after signing in — on the public map, to the report that
 * was open, which is where the reader was about to do something.
 */
export function SignInLink() {
  const location = useLocation()
  return (
    <Link to="/login" state={{ from: location }} className="text-brand-400 hover:underline">
      Влезте
    </Link>
  )
}
