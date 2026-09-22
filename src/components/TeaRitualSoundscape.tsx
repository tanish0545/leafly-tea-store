import { useState, useRef, useEffect } from "react";
import teaRitualTrack from "../assets/tea-ritual.mp3";
import teaMakerTrack from "../assets/tea-maker-music.mp3";
import "./TeaRitualSoundscape.css";

export type AudioTrack = {
  title: string;
  artist: string;
  subtitle: string;
  src: string;
};

const SOUNDSCAPE_PLAYLIST: AudioTrack[] = [
  {
    title: "Tea Ritual Meditation",
    artist: "Leafly · Bansuri & Tanpura",
    subtitle: "Gentle Indian instrumental soundscape for quiet steeping",
    src: teaRitualTrack,
  },
  {
    title: "Darjeeling Mist Symphony",
    artist: "Leafly · Flute & Santoor",
    subtitle: "Harmonious high-mountain melodies for morning clarity",
    src: teaMakerTrack,
  },
  {
    title: "Dusk Tea Soundscape",
    artist: "Leafly · Ambient Raga",
    subtitle: "Calming acoustic frequencies for peaceful evening winding down",
    src: teaRitualTrack,
  },
];

export default function TeaRitualSoundscape() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isLooping, setIsLooping] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = SOUNDSCAPE_PLAYLIST[currentTrackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.loop = isLooping;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (!isLooping) {
        handleNext();
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrackIndex, isLooping, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrackIndex]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Browser audio policy catch
          setIsPlaying(false);
        });
    }
  };

  const handlePrev = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const nextIndex = currentTrackIndex === 0 ? SOUNDSCAPE_PLAYLIST.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(nextIndex);
    setCurrentTime(0);
  };

  const handleNext = () => {
    const nextIndex = currentTrackIndex === SOUNDSCAPE_PLAYLIST.length - 1 ? 0 : currentTrackIndex + 1;
    setCurrentTrackIndex(nextIndex);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = Number(e.target.value);
    setVolume(nextVolume);
    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <section className="tea-soundscape-section" aria-label="Tea Ritual Soundscape Player">
      <div className="tea-soundscape-container">
        {/* Hidden native HTML5 Audio element */}
        <audio
          ref={audioRef}
          src={currentTrack.src}
          preload="none"
        />

        <div className="tea-soundscape-header">
          <div className="tea-soundscape-badge">
            <span className="sound-wave-icon">♪</span>
            <span className="sound-wave-label">MEDITATIVE AMBIANCE</span>
          </div>
          <h2 className="tea-soundscape-title">TEA RITUAL SOUNDSCAPE</h2>
          <p className="tea-soundscape-subtitle">Quiet moments, one cup at a time.</p>
        </div>

        <div className="tea-soundscape-card">
          <div className="tea-soundscape-track-info">
            <div className={`tea-soundscape-disc ${isPlaying ? "spinning" : ""}`} aria-hidden="true">
              <span className="disc-inner">🫖</span>
            </div>
            <div className="tea-soundscape-meta">
              <span className="tea-soundscape-tag">{currentTrack.artist}</span>
              <h3 className="tea-soundscape-track-title">{currentTrack.title}</h3>
              <p className="tea-soundscape-desc">{currentTrack.subtitle}</p>
            </div>
          </div>

          <div className="tea-soundscape-controls-wrap">
            {/* Progress bar */}
            <div className="tea-soundscape-progress-row">
              <span className="time-display">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="tea-soundscape-seeker"
                aria-label="Seek track position"
              />
              <span className="time-display">{formatTime(duration)}</span>
            </div>

            {/* Buttons row */}
            <div className="tea-soundscape-buttons-row">
              <button
                type="button"
                className="soundscape-btn secondary"
                onClick={handlePrev}
                aria-label="Previous track"
                title="Previous track"
              >
                ⏮
              </button>

              <button
                type="button"
                className={`soundscape-btn play-btn ${isPlaying ? "playing" : ""}`}
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause music" : "Play music"}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <button
                type="button"
                className="soundscape-btn secondary"
                onClick={handleNext}
                aria-label="Next track"
                title="Next track"
              >
                ⏭
              </button>

              <button
                type="button"
                className={`soundscape-btn toggle-btn ${isLooping ? "active" : ""}`}
                onClick={() => setIsLooping(!isLooping)}
                aria-label={isLooping ? "Disable looping" : "Enable looping"}
                title={isLooping ? "Looping enabled" : "Looping disabled"}
              >
                🔁
              </button>

              {/* Volume control */}
              <div className="tea-soundscape-volume">
                <span className="volume-icon" aria-hidden="true">
                  {volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="tea-soundscape-volume-slider"
                  aria-label="Adjust soundscape volume"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
