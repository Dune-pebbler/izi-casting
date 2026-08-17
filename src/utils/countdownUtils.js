export const isCountdownExpired = (slide, now = Date.now()) =>
  slide.layout === "countdown" &&
  !!slide.countdownTargetDate &&
  new Date(slide.countdownTargetDate).getTime() <= now;

// Once a countdown slide's target date/time has passed, it should stop
// being shown automatically instead of requiring someone to manually flip
// the "visible" toggle off in the admin panel.
export const hideExpiredCountdownSlides = (playlists) => {
  const now = Date.now();
  let changed = false;

  const nextPlaylists = playlists.map((playlist) => {
    if (!playlist.slides || playlist.slides.length === 0) return playlist;

    const nextSlides = playlist.slides.map((slide) => {
      const isExpiredCountdown =
        slide.isVisible !== false && isCountdownExpired(slide, now);

      if (!isExpiredCountdown) return slide;

      changed = true;
      return { ...slide, isVisible: false };
    });

    return { ...playlist, slides: nextSlides };
  });

  return { playlists: changed ? nextPlaylists : playlists, changed };
};
