"use client";

export default function Footer() {
    const year = new Date().getFullYear()

    return (
        <footer style={{
            marginTop: "4rem",
            padding: "1.5rem 3rem",
            borderTop: "1px solid #1a1a2a",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            fontSize: "1rem",
            color: "#444",
        }}>
            <span>
                &copy; {year}{" "}
                <a
                    href="https://codercarl.dev"
                    className="link"
                >
                    Carl Davidson
                </a>
                {" "}- All rights reserved.
            </span>

            <span style={{ color: "#4c4c71" }}>テレビ</span>

            <a
                href="mailto:codercarl1243@gmail.com"
                className="link"

            >
                codercarl1243@gmail.com
            </a>
        </footer>
    )
}