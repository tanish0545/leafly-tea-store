type CouponRewardAnimationProps = {
  onComplete: () => void;
  couponCode?: string;
};

export default function CouponRewardAnimation({ onComplete }: CouponRewardAnimationProps) {
  if (typeof onComplete === "function") {
    onComplete();
  }
  return null;
}
