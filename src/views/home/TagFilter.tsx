import { Link } from 'react-router-dom';

interface TagFilterProps {
  tags: string[];
  activeTag: string;
  totalPosts: number;
  onSelect: (tag: string) => void;
}

// 标签筛选条:三个主题共用同一份结构,视觉样式由各主题样式表决定
export default function TagFilter({
  tags,
  activeTag,
  totalPosts,
  onSelect,
}: TagFilterProps) {
  return (
    <div className="tag-filter">
      <button
        type="button"
        className={activeTag === '' ? 'tag tag-active' : 'tag'}
        onClick={() => onSelect('')}
      >
        全部 ({totalPosts})
      </button>
      {tags.map((tag) => (
        <button
          type="button"
          key={tag}
          className={activeTag === tag ? 'tag tag-active' : 'tag'}
          onClick={() => onSelect(tag)}
        >
          {tag}
        </button>
      ))}
      <Link to="/tags" className="tag tag-more" title="查看全部标签">
        …
      </Link>
    </div>
  );
}
