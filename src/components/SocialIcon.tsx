// 社交胶囊上的小图标
//
// 匹配规则:按「名称 + 链接」里的关键词自动选图标,匹配不到就用通用地球图标。
// 颜色用 currentColor,所以胶囊悬停变色时图标自动跟着变;
// 尺寸用 svg 属性固定(15px),不依赖各主题 CSS —— 十套主题无需各写一条规则。

const ICON_SIZE = 15;

type SocialIconKind = 'github' | 'mail' | 'globe';

function pickKind(name: string, url: string): SocialIconKind {
  const haystack = `${name} ${url}`.toLowerCase();
  if (haystack.includes('github')) return 'github';
  if (/(mail|email|邮箱)/.test(haystack)) return 'mail';
  return 'globe';
}

// GitHub 官方标记(Octicons mark-github,MIT)
function GithubMark() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// 信封(邮箱类条目)
function MailIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

// 通用地球(个人网站 / 未识别的平台)
function GlobeIcon() {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

type SocialIconProps = {
  name: string;
  url: string;
};

export function SocialIcon({ name, url }: SocialIconProps) {
  const kind = pickKind(name, url);
  if (kind === 'github') return <GithubMark />;
  if (kind === 'mail') return <MailIcon />;
  return <GlobeIcon />;
}
