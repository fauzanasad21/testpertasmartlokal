/* eslint-disable react/prop-types */
import { useState } from "react";

function Search(props) {
    const [search, setSearch] = useState("");

    const changesearch = () => {
        props.changesearch(search);  // Memanggil fungsi dari props untuk mengubah data di Homepage
    };
    const onKeyDown = (e) => {
        if(e.key === "Enter"){
            changesearch();
        }
    }

    return (
        <>
            <div>
                Cari Artikel : <input onChange={(e) => setSearch(e.target.value)} onKeyDown={onKeyDown}></input>
                <button onClick={changesearch}>Cari</button>
            </div>
            <small>
                Ditemukan {props.totalposts} data dengan pencarian kata {search}
            </small>
        </>
    );
}

export default Search;
