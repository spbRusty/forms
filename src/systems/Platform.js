// Адаптер рекламных возможностей Яндекс Игр.
export function createPlatform({ pause, resume, startIfGame }) {
  const Banner = {
    show() {
      try { window.ysdk?.adv?.showBannerAdv?.(); } catch (_) {}
    },
    hide() {
      try { window.ysdk?.adv?.hideBannerAdv?.(); } catch (_) {}
    }
  };

  const Ads = {
    _busy: false,
    _lastInter: 0,
    COOL: 180000,
    inter(callback) {
      const now = Date.now();
      if (!window.ysdk || now - this._lastInter < this.COOL) {
        callback?.();
        return;
      }
      this._busy = true;
      this._lastInter = now;
      pause();
      try {
        window.ysdk.adv.showFullscreenAdv({ callbacks: {
          onClose: () => { this._busy = false; resume(); callback?.(); },
          onError: () => { this._busy = false; resume(); callback?.(); }
        }});
      } catch (_) {
        this._busy = false;
        resume();
        callback?.();
      }
    },
    rewarded(onReward, onClose) {
      if (!window.ysdk) {
        onReward?.();
        onClose?.();
        return;
      }
      this._busy = true;
      pause();
      try {
        window.ysdk.adv.showRewardedVideo({ callbacks: {
          onRewarded: () => onReward?.(),
          onClose: () => { this._busy = false; resume(); startIfGame(); onClose?.(); },
          onError: () => { this._busy = false; resume(); onClose?.(); }
        }});
      } catch (_) {
        this._busy = false;
        resume();
        onClose?.();
      }
    }
  };

  return { Ads, Banner };
}
