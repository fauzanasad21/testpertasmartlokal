import { Link, useLoaderData } from "react-router-dom";

function Blog (){
    const apiData = useLoaderData();
    return (
        <>
            <h2>Tulisan Saya</h2>
            {apiData.map((item, index) => (
                <div key={index}>
                    <Link to={`/blog/${item.id}`}>- {item.title}</Link>
                </div>
            ))}
        </>
    )
}

export default Blog