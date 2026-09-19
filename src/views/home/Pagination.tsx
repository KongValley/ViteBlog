interface PaginationProps {
  page: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
}

// 分页控件:三个主题共用同一份结构,视觉样式由各主题样式表决定
export default function Pagination({
  page,
  totalPages,
  onGoToPage,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="文章分页">
      <button
        type="button"
        className="page-btn"
        disabled={page === 1}
        onClick={() => onGoToPage(page - 1)}
      >
        ◀ 上一页
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
        <button
          type="button"
          key={num}
          className={num === page ? 'page-btn page-current' : 'page-btn'}
          onClick={() => onGoToPage(num)}
        >
          {num}
        </button>
      ))}
      <button
        type="button"
        className="page-btn"
        disabled={page === totalPages}
        onClick={() => onGoToPage(page + 1)}
      >
        下一页 ▶
      </button>
    </nav>
  );
}
