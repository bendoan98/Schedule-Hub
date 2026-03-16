export default function PanelSection({
  as: Component = 'section',
  className = 'panel',
  title,
  titleAs: TitleTag = 'h3',
  description,
  descriptionClassName,
  children
}) {
  return (
    <Component className={className}>
      {title ? <TitleTag>{title}</TitleTag> : null}
      {description ? <p className={descriptionClassName}>{description}</p> : null}
      {children}
    </Component>
  );
}
