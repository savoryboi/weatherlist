"use client"

import { useEffect, useState } from 'react';
import axios from 'axios';
import { metadata } from './layout';

function Home() {
  const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
  const RESPONSE_TYPE = 'token';
  const SCOPE = 'user-library-read playlist-modify-public playlist-modify-private playlist-read-private user-read-email user-top-read';
  const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID;
  const WEATHER_KEY = process.env.NEXT_PUBLIC_WEATHER_KEY;

  const REDIRECT_URI = 'https://weatherlist.vercel.app/';
  // const REDIRECT_URI = 'http://localhost:3000/';

  const [token, setToken] = useState("");
  const [zip, setZip] = useState('');
  const [playlistCreated, setPlaylistCreated] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');

  // const [location, setLocation] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    let token = window.localStorage.getItem("token");

    if (!token && hash) {
      token = hash.substring(1).split('&').find(elem => elem.startsWith('access_token')).split('=')[1];

      window.location.hash = "";
      window.localStorage.setItem("token", token)
    }

    setToken(token)
  }, [])

  const logout = () => {
    setToken("");
    window.localStorage.removeItem('token');

  }

  const initializeDataFetch = async (condition, location, target_dancability, target_energy, target_valence, target_mode, target_acousticness) => {
    const { data } = await axios.get('https://api.spotify.com/v1/me/top/artists', {
      params: {
        limit: 3,
        time_range: 'long_term'
      },
      headers: {
        'Accept': "application/json",
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    });

    const trackData = await axios.get('https://api.spotify.com/v1/me/top/tracks', {
      params: {
        limit: 2,
        time_range: 'short_term'
      },
      headers: {
        'Accept': "application/json",
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    })

    const topTracks = trackData.data.items.map(track => track.id);
    const topGenres = [...new Set(data.items.map(obj => obj.genres).flat())];
    const seedGenres = [];
    for (let i = 0; i < 3; i++) {
      let random = Math.floor(Math.random() * topGenres.length);
      seedGenres.push(encodeURIComponent(topGenres[random]));
    }

    console.log(seedGenres);

    getRecomendations(condition, location, target_dancability, target_energy, target_valence, target_mode, target_acousticness, topTracks, seedGenres);
  };

  const getWeatherData = async (zip) => {

    const { data } = await axios.get('https://api.weatherapi.com/v1/current.json', {
      params: {
        key: WEATHER_KEY,
        q: zip
      },
      headers: {
        config: 'Access-Control-Allow-Origin'
      }
    })

    console.log(data)
    // setLocation(data.location.name);

    const condition = data.current.condition.text;
    const location = data.location.name;
    const cloud = data.current.cloud;
    const temp = data.current.feelslike_f;
    const precip = data.current.precip_in > 0.175;
    const uv = data.current.uv;
    const humidity = data.current.humidity;

    console.log(data)

    let target_dancability,
      target_energy,
      target_valence,
      target_mode,
      target_acousticness;

    // if its raining, minor key, and vice versa
    if (!precip) {
      target_mode = 1;
    } else {
      target_mode = 0;
    };

    // danceability determind by temp
    target_dancability = (temp / 100) > 1 ? 1 : (temp / 100);

    // energy of music determind by humidity 
    target_energy = 1 - (humidity / 100);

    // valence (aka happy feeling-ness) by clouds
    target_valence = 1 - (cloud / 100);

    // acoustincness by uv
    if (uv < 3) {
      target_acousticness = 0.5 + Math.random() * 0.5;
    } else {
      target_acousticness = Math.random() * 0.5;
    };

    initializeDataFetch(condition,
      location,
      target_dancability,
      target_energy,
      target_valence,
      target_mode,
      target_acousticness)
  };

  const getRecomendations = async (condition, location, target_dancability, target_energy, target_valence, target_mode, target_acousticness, topTracks, seedGenres) => {

    try {
      const response = await axios.get('https://api.spotify.com/v1/recommendations', {
        params: {
          limit: 50,
          seed_genres: seedGenres.join(','),
          seed_tracks: topTracks.join(','),
          target_acousticness: target_acousticness,
          target_dancability: target_dancability,
          target_energy: target_energy,
          target_valence: target_valence,
          target_mode: target_mode
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })

      const recommendations = response.data.tracks.map(rec => rec.uri);
      console.log(`recommendations:`)
      console.log(recommendations)

      getUserId(recommendations, condition, location);

    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  };

  const getUserId = async (recommendations, condition, location) => {
    const user_profile = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })

    const user_id = user_profile.data.id;

    createPlaylist(user_id, recommendations, condition, location)
  }

  const createPlaylist = async (user_id, recommendations, condition, location) => {

    try {
      const new_playlist = await axios.post(
        `https://api.spotify.com/v1/users/${user_id}/playlists`,
        {
          name: location ? `${condition} | ${location}` : `${zip} | ${condition}`,
          description: "created on weatherlist.vercel.app",
          public: false
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setPlaylistUrl(new_playlist.data.external_urls.spotify);
      console.log('Created playlist:', playlistUrl);
      const new_playlist_id = new_playlist.data.id;

      addSongsToPlaylist(new_playlist_id, recommendations);

      setPlaylistCreated(true);

      return new_playlist.data;

    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }


  };

  const addSongsToPlaylist = async (id, uris) => {

    try {
      const response = await axios.post(`https://api.spotify.com/v1/playlists/${id}/tracks`,
        {
          "uris": uris
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

      console.log(response)

    } catch (error) {
      console.log(error)
    }

  }

  const handleSubmit = (event) => {
    event.preventDefault();
    getWeatherData(zip)
  }

  const handleStartOver = (event) => {
    event.preventDefault();
    setPlaylistCreated(false);
  }


  return (
    <main>
      <div id='center_page'>
        <h1 id='title'>weatherlist</h1>
        {!token ?
          <div className='login_wrapper'>
            <h3>create playlists based on your local weather</h3>
            <a id='loginLink' href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}&response_type=${RESPONSE_TYPE}&show_dialogue=true`}><button id='loginBtn'>login to spotify</button></a>
          </div>
          : token && playlistCreated ?
          <div id='playlist_link_div'>
            <a id='playlist_link' target="_blank" href={playlistUrl}><h2>take me to my playlist</h2></a>
            <h2 onClick={handleStartOver} id='start_over'>start over</h2>
          </div>
          : 
          <div className='main_area'>
            <h3 id='message_element'>enter your zipcode to create a weather-based playlist</h3>
            <div className='form_wrap'>
              <form id="zipcode-form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="zip_code_input"
                  value={zip}
                  onChange={(event) => setZip(event.target.value)}
                  placeholder='ZIP Code'
                />
                <button type="submit" id="zip_sbmt">GO</button>
              </form>
            </div>
            <button id='logoutBtn' onClick={logout}>LOGOUT</button>
          </div>
      
        }
      </div>
    </main>
  )

};

export default Home;
