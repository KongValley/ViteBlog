import { site } from '../data/site'

export default function PlayerCard() {
  return (
    <aside className="player-card" aria-label="站长信息">
      <div className="gb-shell">
        {/* 机身顶部凹槽线 */}
        <div className="gb-grooves" aria-hidden="true">
          <i />
          <i />
        </div>

        {/* 深色条纹:电源灯 + 屏幕 */}
        <div className="gb-stripe">
          <span className="gb-stripe-text pixel-en">
            DOT MATRIX WITH STEREO SOUND
          </span>
          <span className="gb-led" aria-hidden="true" />
          {/* 电源图标(替代 BATTERY 文字,小字号点阵字会缺字) */}
          <svg
            className="gb-power-icon"
            viewBox="0 0 12 12"
            width={11}
            height={11}
            aria-hidden="true"
          >
            <path
              d="M6 1v5"
              stroke="#b9bdc4"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M3.2 2.8a4.4 4.4 0 1 0 5.6 0"
              stroke="#b9bdc4"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          <a
            className="gb-screen"
            href={`https://github.com/${site.githubUser}`}
            target="_blank"
            rel="noopener"
            title="点击访问我的 GitHub 主页"
          >
            <img
              className="gb-avatar"
              src={site.avatar}
              alt={`${site.author} 的头像`}
              width={120}
              height={120}
              loading="eager"
            />
            <span className="gb-screen-name">
              <span className="blink" aria-hidden="true">
                ▶
              </span>
              {site.author}
            </span>
          </a>
        </div>

        {/* 仿 GB 机身 logo */}
        <p className="gb-logo">
          {site.name} <b>GAME BOY</b>
          <sup>™</sup>
        </p>

        {/* 按键:D-pad 左,B/A 右(A 高 B 低) */}
        <div className="gb-controls">
          <div className="gb-dpad" aria-hidden="true">
            <i />
          </div>
          <div className="gb-ab">
            <span className="gb-key">
              <span className="gb-btn-round" aria-hidden="true" />
              <b className="gb-key-label pixel-en">B</b>
            </span>
            <span className="gb-key gb-key-a">
              <span className="gb-btn-round" aria-hidden="true" />
              <b className="gb-key-label pixel-en">A</b>
            </span>
          </div>
        </div>

        {/* SELECT / START 胶囊键(START 是真链接) */}
        <div className="gb-mid">
          <span className="gb-pill-wrap" aria-hidden="true">
            <span className="gb-pill" />
            <b className="gb-pill-label">SELECT</b>
          </span>
          <a
            className="gb-pill-wrap gb-pill-link"
            href={`https://github.com/${site.githubUser}`}
            target="_blank"
            rel="noopener"
            title="GitHub 主页"
          >
            <span className="gb-pill" />
            <b className="gb-pill-label">START</b>
          </a>
        </div>

        {/* 右下角喇叭格栅 */}
        <div className="gb-speaker" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>

      {/* 玩家信息放在机身下方 */}
      <div className="gb-id">
        <p className="gb-name">{site.author}</p>
        <p className="gb-handle pixel-en">@{site.githubUser}</p>
        <p className="gb-motto">{site.tagline}</p>
      </div>
    </aside>
  )
}
