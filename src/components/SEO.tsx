import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
}

const SITE = "https://flexi-earnug.lovable.app";

export function SEO({ title, description, path = "/", type = "website" }: SEOProps) {
  const url = `${SITE}${path}`;
  const fullTitle = title.includes("FlexiEarn") ? title : `${title} | FlexiEarn Uganda`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
    </Helmet>
  );
}
