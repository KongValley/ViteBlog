import { Link } from 'react-router-dom';
import { PixelIcon, type PixelIconName } from '../../components/PixelIcon';
import PlayerCard from '../../components/PlayerCard';
import { formatDate } from '../../data/format';
import { posts } from '../../data/posts';
import { site } from '../../data/site';
import { stickerIcons } from '../../data/stickerIcons';
import Pagination from './Pagination';
import type { HomeData } from './shared';
import TagFilter from './TagFilter';

const postIcons: PixelIconName[] = [
  'star',
  'rocket',
  'smile',
  'wink',
  'laugh',
  'surprised',
  'love',
  'heart',
  'ghost',
  'gamepad',
  'cat',
  'mushroom',
  'hero',
  'wizard',
  'ninja',
  'knight',
  'robot',
  'slime',
  'invader',
  'fighter',
  'sword',
  'shield',
  'potion',
  'bomb',
  'chest',
  'key',
  'gem',
  'joystick',
  'portal',
  'trophy',
  ...stickerIcons,
];

// 个别文章手动指定图标,覆盖哈希随机分配的结果
const iconOverrides: Record<string, PixelIconName> = {
  'typescript/typescript-webpack': 'shield',
  'tool/自用代码提交格式': 'invader',
  'tool/Hexo引入mermaid': 'robot',
  'tool/Hexo外链播放器': 'cat',
  'typescript/typescript入门': 'wizard',
};

function getPostIcon(slug: string): PixelIconName {
  const override = iconOverrides[slug];
  if (override) return override;

  let hash = 0;

  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }

  return postIcons[hash % postIcons.length];
}

// 像素风首页:游戏机名片 + 卡片列表
export default function PixelHome({
  visiblePosts,
  page,
  totalPages,
  activeTag,
  visibleTags,
  onSelectTag,
  onGoToPage,
}: HomeData) {
  return (
    <div className="home-layout">
      <PlayerCard />

      <div className="home-main">
        <section className="hero">
          <h1 className="hero-title">{site.name}</h1>
          <p className="hero-tagline">
            {site.tagline} — 基于 React + Vite 构建
          </p>
          <p className="hero-press pixel-en blink">★ PRESS START TO READ ★</p>
        </section>

        {visibleTags.length > 0 && (
          <TagFilter
            tags={visibleTags}
            activeTag={activeTag}
            totalPosts={posts.length}
            onSelect={onSelectTag}
          />
        )}

        <section className="post-list">
          {visiblePosts.map((post) => (
            <article key={post.slug} className="post-card">
              {post.cover && (
                <img
                  className="post-card-cover"
                  src={post.cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  data-no-zoom="true"
                />
              )}
              <Link to={`/post/${post.slug}`} className="post-card-link">
                <h2 className="post-card-title">
                  <span className="post-card-icon" aria-hidden="true">
                    <PixelIcon name={getPostIcon(post.slug)} />
                  </span>
                  {post.title}
                </h2>
                <p className="post-card-excerpt">{post.excerpt}</p>
                <div className="post-card-meta">
                  <time className="post-card-date">
                    {formatDate(post.date)}
                  </time>
                  {post.tags.map((tag) => (
                    <span key={tag} className="tag tag-small">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </article>
          ))}

          {visiblePosts.length === 0 && (
            <p className="empty">这个标签下还没有文章~</p>
          )}
        </section>

        <Pagination
          page={page}
          totalPages={totalPages}
          onGoToPage={onGoToPage}
        />
      </div>
    </div>
  );
}
