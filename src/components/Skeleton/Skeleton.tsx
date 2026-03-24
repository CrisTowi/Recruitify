import styles from './Skeleton.module.css';

interface Props {
  width?: string | number;
  height?: string | number;
}

export default function Skeleton({ width = '100%', height = 16 }: Props) {
  return (
    <span
      className={styles.skeleton}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
