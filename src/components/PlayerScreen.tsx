import { site } from '../data/site';

// 掌机屏幕:绿底液晶屏 + 像素头像 + 角色名,像游戏里的选人界面
// 首页名片卡(PlayerCard)与关于页联系卡片共用这一块,点屏幕进 GitHub 主页
export default function PlayerScreen() {
  return (
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
  );
}
