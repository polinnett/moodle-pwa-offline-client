interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export const Icon = ({ name, size = 20, className = "" }: IconProps) => {
  const src = new URL(`../../assets/${name}.svg`, import.meta.url).href;

  return (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      alt={name}
      style={{
        filter:
          "invert(40%) sepia(80%) saturate(500%) hue-rotate(90deg) brightness(90%)",
      }}
    />
  );
};
