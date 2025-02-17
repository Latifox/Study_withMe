
import { useEffect, useRef } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

interface Segment {
  title: string;
  segment_description: string;
  sequence_number: number;
}

// Predefined locations around the globe for markers
const markerLocations = [
  { titlePos: { lng: -100, lat: 40 }, descPos: { lng: -85, lat: 40 } },  // North America
  { titlePos: { lng: -60, lat: -20 }, descPos: { lng: -45, lat: -20 } }, // South America
  { titlePos: { lng: 0, lat: 50 }, descPos: { lng: 15, lat: 50 } },      // Europe
  { titlePos: { lng: 20, lat: 0 }, descPos: { lng: 35, lat: 0 } },       // Africa
  { titlePos: { lng: 100, lat: 30 }, descPos: { lng: 115, lat: 30 } },   // Asia
  { titlePos: { lng: 135, lat: -25 }, descPos: { lng: 150, lat: -25 } }, // Australia
];

const AIProfessorLoading = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { lectureId } = useParams();

  const { data: segments } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('*')
        .eq('lecture_id', parseInt(lectureId))
        .order('sequence_number');

      if (error) throw error;
      return data as Segment[];
    }
  });

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = 'pk.eyJ1IjoiZGV2bG92YWJsZSIsImEiOiJjbHNzOWdzYnMwMWNqMmpxdDlucGNiYmh0In0.YkZvvk8M5fNuv0hO55PGlw';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      zoom: 1.5,
      center: [30, 15],
      pitch: 45,
      attributionControl: false,
      interactive: false // Disable interaction
    });

    // Add atmosphere and fog effects
    map.current.on('style.load', () => {
      map.current?.setFog({
        color: 'rgb(255, 255, 255)',
        'high-color': 'rgb(200, 200, 225)',
        'horizon-blend': 0.2,
      });
    });

    // Rotation animation
    const secondsPerRevolution = 240;
    function spinGlobe() {
      if (!map.current) return;
      const center = map.current.getCenter();
      center.lng -= 360 / secondsPerRevolution;
      map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      requestAnimationFrame(spinGlobe);
    }

    // Start the globe spinning
    spinGlobe();

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, []);

  // Add markers when segments data is loaded
  useEffect(() => {
    if (!map.current || !segments) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    segments.forEach((segment, index) => {
      if (index >= markerLocations.length) return;

      const location = markerLocations[index];
      
      // Create title marker
      const titleEl = document.createElement('div');
      titleEl.className = 'marker';
      titleEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      titleEl.style.borderRadius = '4px';
      titleEl.style.color = '#ffffff';
      titleEl.style.padding = '8px';
      titleEl.style.fontSize = '14px';
      titleEl.style.maxWidth = '150px';
      titleEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      titleEl.innerHTML = segment.title;

      // Create description marker
      const descEl = document.createElement('div');
      descEl.className = 'marker';
      descEl.style.backgroundColor = 'rgba(255, 68, 68, 0.8)';
      descEl.style.borderRadius = '4px';
      descEl.style.color = '#ffffff';
      descEl.style.padding = '8px';
      descEl.style.fontSize = '12px';
      descEl.style.maxWidth = '200px';
      descEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      descEl.innerHTML = segment.segment_description.slice(0, 100) + '...';

      // Add markers to map
      const titleMarker = new mapboxgl.Marker({ element: titleEl })
        .setLngLat([location.titlePos.lng, location.titlePos.lat])
        .addTo(map.current!);

      const descMarker = new mapboxgl.Marker({ element: descEl })
        .setLngLat([location.descPos.lng, location.descPos.lat])
        .addTo(map.current!);

      markersRef.current.push(titleMarker, descMarker);
    });
  }, [segments]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl rounded-lg overflow-hidden aspect-[16/9] relative">
          <div ref={mapContainer} className="absolute inset-0" />
        </div>
      </div>
    </div>
  );
};

export default AIProfessorLoading;
