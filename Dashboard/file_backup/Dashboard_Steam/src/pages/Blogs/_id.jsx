import {useLoaderData } from "react-router-dom";

function SinglePost() {
    const apiData = useLoaderData();
    const randomData = useLoaderData();
    const randdata = randomData?.suhu;

    console.log(randdata);

    return (
        <>
        <h2>{apiData?.title}</h2>
        <div>{apiData?.body}</div>
        </>
    )
}

export default SinglePost;