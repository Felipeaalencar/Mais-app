export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90">
      <rect width="90" height="90" rx="20" fill="#0f172a"/>
      <path d="M 6,45 L 12,45 L 15,25 L 25,56 L 35,25 L 45,45 L 50,45 L 54,38 L 57,18 L 62,72 L 66,38 L 70,45 L 82,45"
        fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="57" cy="18" r="3.5" fill="#EF9F27"/>
    </svg>
  );
}
