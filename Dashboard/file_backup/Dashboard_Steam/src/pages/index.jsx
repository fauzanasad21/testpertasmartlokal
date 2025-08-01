import postsData from "../posts.json";
import Article from "../components/Article";
import Search from "../components/Search";
import { Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { GlobalContext } from '../context/index';

function Homepage() {
    const [posts, setposts] = useState(postsData);
    const [totalposts, setTotalposts] = useState(0);
    const changesearch = (value) => {
        console.log(value);
        const filteredData = postsData.filter((item) => 
            item.title.includes(value)
        );
        setposts(filteredData);
        console.log(filteredData);
        setTotalposts(filteredData.length);
    };
    const judul = {
        judulPage: "Home",
    }

    return (
        <GlobalContext.Provider value={judul}>
            <>  
                <h1>Simple Blog</h1>
                <Search changesearch={changesearch} totalposts={totalposts} />
                {posts.map(( props , index) => (
                    <Article {...props} key={index} />
                ))}
            </>
        </GlobalContext.Provider>
    );
}

export default Homepage;
