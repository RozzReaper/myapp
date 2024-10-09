import React, { useState, useEffect } from "react";
import Card from "./Card";
import Pokeinfo from "./Pokeinfo";
import axios from "axios";

const Main = () => {
    const [pokeData, setPokeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [url, setUrl] = useState("https://pokeapi.co/api/v2/pokemon/");
    const [nextUrl, setNextUrl] = useState();
    const [prevUrl, setPrevUrl] = useState();
    const [pokeDex, setPokeDex] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9; // Mostrar 9 cartas por página
    const totalItems = 1300; // Ajusta esto según la cantidad total de Pokémon disponibles
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const pokeFun = async () => {
        setLoading(true);
        const res = await axios.get(`${url}?limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`);
        setNextUrl(res.data.next);
        setPrevUrl(res.data.previous);
        getPokemon(res.data.results);
        setLoading(false);
    };

    const getPokemon = async (res) => {
        res.map(async (item) => {
            const result = await axios.get(item.url);
            setPokeData((state) => {
                state = [...state, result.data];
                state.sort((a, b) => (a.id > b.id ? 1 : -1));
                return state;
            });
        });
    };

    useEffect(() => {
        setPokeData([]); 
        pokeFun();
    }, [url, currentPage]); // Añadir currentPage como dependencia

    const handleNext = () => {
        if (nextUrl) {
            setUrl(nextUrl);
            setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
        }
    };

    const handlePrevious = () => {
        if (prevUrl) {
            setUrl(prevUrl);
            setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
        }
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        
        pageNumbers.push(1); // Siempre mostrar la primera página

        // Mostrar un rango dinámico basado en la página actual
        let startPage = Math.max(2, currentPage - 2);
        let endPage = Math.min(totalPages - 1, currentPage + 2);

        if (currentPage < 4) {
            endPage = Math.min(5, totalPages - 1);
        } else if (currentPage > totalPages - 3) {
            startPage = Math.max(totalPages - 4, 2);
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        pageNumbers.push(totalPages); // Siempre mostrar la última página

        return pageNumbers.map((number) => (
            <span
                key={number}
                className={number === currentPage ? "active-page" : ""}
                onClick={() => {
                    setUrl(`https://pokeapi.co/api/v2/pokemon/?offset=${(number - 1) * itemsPerPage}&limit=${itemsPerPage}`);
                    setCurrentPage(number);
                }}
            >
                {number}
            </span>
        ));
    };

    return (
        <>
            <div className="title">Pokémon API</div>
            <div className="container">
                <div className="left-section">
                    <div className="left-content">
                        <Card pokemon={pokeData} loading={loading} infoPokemon={(poke) => setPokeDex(poke)} />
                    </div>
                    <div className="pagination">
                        <button onClick={handlePrevious} disabled={currentPage === 1}>Previous</button>
                        {renderPageNumbers()}
                        <button onClick={handleNext} disabled={currentPage === totalPages}>Next</button>
                    </div>
                </div>
                <div className="right-content">
                    <Pokeinfo data={pokeDex} />
                </div>
            </div>
        </>
    );
};

export default Main;
