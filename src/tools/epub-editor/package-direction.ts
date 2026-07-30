type WritingMode = 'horizontal' | 'vertical';

function setXmlAttribute(tag: string, attribute: string, value: string) {
  const attributePattern = new RegExp(`\\s${attribute}=(["'])[^"']*\\1`, 'i');
  if (attributePattern.test(tag)) {
    return tag.replace(attributePattern, ` ${attribute}="${value}"`);
  }

  return tag.replace(/^<[^\s>]+/i, match => `${match} ${attribute}="${value}"`);
}

export function updatePackageDirection(opfContent: string, writingMode: WritingMode) {
  const isVertical = writingMode === 'vertical';
  const direction = isVertical ? 'rtl' : 'ltr';

  let updatedContent = opfContent.replace(/<package\b[^>]*>/i, (packageTag) => {
    const versionedTag = isVertical
      ? packageTag.replace(/\bversion=(["'])2\.[0-9]+\1/i, (_match, quote) => `version=${quote}3.0${quote}`)
      : packageTag;
    return setXmlAttribute(versionedTag, 'dir', direction);
  });

  updatedContent = updatedContent.replace(/<spine\b[^>]*>/i, spineTag =>
    setXmlAttribute(spineTag, 'page-progression-direction', direction),
  );

  return updatedContent;
}
