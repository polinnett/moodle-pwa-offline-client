interface IconProps {
    name: string
    size?: number
    className?: string
  }
  
  export const Icon = ({ name, size = 20, className = '' }: IconProps) => {
    return (
      <img
        src={`/src/assets/${name}.svg`}
        width={size}
        height={size}
        className={className}
        alt={name}
        style={{
          filter: 'invert(40%) sepia(80%) saturate(500%) hue-rotate(90deg) brightness(90%)'
        }}
      />
    )
  }