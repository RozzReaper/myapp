import React, { useState, useEffect } from "react";
import Card from "./Card";
import Pokeinfo from "./Pokeinfo";
import axios from "axios";

const itemsPerPage = 9;
const pokemonUrl = "https://pokeapi.co/api/v2/pokemon/";

const Main = () => {
    const [pokeData, setPokeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pokeDex, setPokeDex] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [error, setError] = useState("");
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    useEffect(() => {
        let active = true;

        const pokeFun = async () => {
            setLoading(true);
            setError("");
            setPokeData([]);

            try {
                const res = await axios.get(
                    `${pokemonUrl}?limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`
                );
                const pokemon = await Promise.all(
                    res.data.results.map(async (item) => {
                        const result = await axios.get(item.url);
                        return result.data;
                    })
                );

                if (active) {
                    setTotalItems(res.data.count);
                    setPokeData(pokemon.sort((a, b) => a.id - b.id));
                }
            } catch (err) {
                if (active) {
                    setError("Unable to load Pokémon. Please try again.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        pokeFun();
        return () => {
            active = false;
        };
    }, [currentPage]);

    const handleNext = () => {
        if (!loading && currentPage < totalPages) {
            setCurrentPage((page) => page + 1);
        }
    };

    const handlePrevious = () => {
        if (!loading && currentPage > 1) {
            setCurrentPage((page) => page - 1);
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

        if (totalPages > 1) {
            pageNumbers.push(totalPages); // Siempre mostrar la última página
        }

        return pageNumbers.map((number) => (
            <span
                key={number}
                className={number === currentPage ? "active-page" : ""}
                onClick={() => {
                    if (!loading) {
                        setCurrentPage(number);
                    }
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
                        {error && <p role="alert">{error}</p>}
                        <Card pokemon={pokeData} loading={loading} infoPokemon={(poke) => setPokeDex(poke)} />
                    </div>
                    <div className="pagination">
                        <button onClick={handlePrevious} disabled={loading || currentPage === 1}>Previous</button>
                        {renderPageNumbers()}
                        <button onClick={handleNext} disabled={loading || currentPage === totalPages}>Next</button>
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
