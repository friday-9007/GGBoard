import './AnimatedBackground.css';

export default function AnimatedBackground() {
  return (
    <div className="global-bg" aria-hidden="true">
      <div className="bg-bracket-lines"></div>
      <div className="bg-radial-glow"></div>
    </div>
  );
}
